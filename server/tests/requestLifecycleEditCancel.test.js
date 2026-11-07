/**
 * server/tests/requestLifecycleEditCancel.test.js
 *
 * Comprehensive tests for Blood Request Lifecycle (Edit, Cancel, Undo-Create/Delete, Close):
 * - Edit rules: units cannot go below (pledged + received) -> 400; blood group / hospital edit rejected -> 400;
 *   non-owner -> 403; edit history logged; donors notified on urgency/units changes.
 * - Cancel rules: atomic transaction releases pending pledges ('released'), returns hospital stock,
 *   cooldown and donation stats unchanged, donors notified, can pledge again immediately.
 * - Cancel conflict: if fulfilled donations exist -> 409, closeRequest works.
 * - Double cancel returns 409.
 * - Undo-create / delete: < 5 min & 0 pledges -> deleted; > 5 min or with pledges -> 400.
 * - Reads-before-writes Firestore transaction spy passes for cancel.
 * - AI Assistant tools and intent router exclude cancelled requests and provide cancel instructions.
 */

require('./setup');

const request = require('supertest');
const { connect, clearDatabase, disconnect } = require('./helpers/db');
const { registerUser, registerHospital } = require('./helpers/auth');
const { getDb } = require('../src/config/db');

let app;
let User;
let Hospital;
let BloodRequest;
let DonorProfile;
let Donation;
let Notification;
let InventoryTransaction;
let hospitalAiTools;
let keywordRouter;

beforeAll(async () => {
  await connect();
  app = require('../src/app');
  User = require('../src/repositories/user.repository');
  Hospital = require('../src/repositories/hospital.repository');
  BloodRequest = require('../src/repositories/bloodRequest.repository');
  DonorProfile = require('../src/repositories/donorProfile.repository');
  Donation = require('../src/repositories/donation.repository');
  Notification = require('../src/repositories/notification.repository');
  InventoryTransaction = require('../src/repositories/inventoryTransaction.repository');
  hospitalAiTools = require('../src/services/aiTools/hospitalTools');
  keywordRouter = require('../src/services/keywordRouter');
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnect();
});

const setupHospital = async (name = 'City General Emergency Hospital') => {
  const { user, token } = await registerHospital(app, {
    name,
    email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}@test.com`,
    phone: '1234567890',
  });
  const hospital = await Hospital.findOne({ user: user._id });
  hospital.isVerified = true;
  hospital.inventory = [
    { bloodGroup: 'B+', units: 2 },
    { bloodGroup: 'O-', units: 1 },
  ];
  await hospital.save();
  return { user, token, hospital };
};

const setupDonor = async (name = 'Alex Rivera', bloodGroup = 'B+') => {
  const { user, token } = await registerUser(app, {
    name,
    email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}@test.com`,
    bloodGroup,
    role: 'donor',
  });
  const donorProfile = await DonorProfile.findOne({ user: user._id });
  return { user, token, donorProfile };
};

describe('Blood Request Lifecycle: Edit, Cancel, Undo-Create & Close', () => {
  describe('1. Request Editing (Validation, Authorization, Notifications)', () => {
    test('Non-owner cannot edit a request (returns 403)', async () => {
      const hospA = await setupHospital('Hospital Alpha');
      const hospB = await setupHospital('Hospital Beta');

      const reqDoc = await BloodRequest.create({
        patientName: 'Jane Doe',
        bloodGroup: 'B+',
        unitsNeeded: 3,
        urgency: 'high',
        targetHospital: hospA.hospital._id.toString(),
        hospital: hospA.hospital._id.toString(),
        hospitalName: hospA.hospital.name,
        requester: hospA.user._id,
        status: 'open',
      });

      const res = await request(app)
        .patch(`/api/requests/${reqDoc._id}`)
        .set('Authorization', `Bearer ${hospB.token}`)
        .send({ patientName: 'Hacked Name' });

      expect(res.status).toBe(403);
    });

    test('Blood group and target hospital cannot be edited (returns 400)', async () => {
      const hosp = await setupHospital();
      const reqDoc = await BloodRequest.create({
        patientName: 'Jane Doe',
        bloodGroup: 'B+',
        unitsNeeded: 2,
        urgency: 'high',
        targetHospital: hosp.hospital._id.toString(),
        hospital: hosp.hospital._id.toString(),
        hospitalName: hosp.hospital.name,
        requester: hosp.user._id,
        status: 'open',
      });

      // Try editing blood group
      const resBlood = await request(app)
        .patch(`/api/requests/${reqDoc._id}`)
        .set('Authorization', `Bearer ${hosp.token}`)
        .send({ bloodGroup: 'O-' });

      expect(resBlood.status).toBe(400);
      expect(resBlood.body.message).toMatch(/blood group cannot be edited/i);

      // Try editing hospital
      const resHosp = await request(app)
        .patch(`/api/requests/${reqDoc._id}`)
        .set('Authorization', `Bearer ${hosp.token}`)
        .send({ targetHospital: 'different_id_123' });

      expect(resHosp.status).toBe(400);
      expect(resHosp.body.message).toMatch(/hospital assignment cannot be edited/i);
    });

    test('Units needed cannot be reduced below (pledged + received) -> returns 400', async () => {
      const hosp = await setupHospital();
      const donor = await setupDonor();

      const reqDoc = await BloodRequest.create({
        patientName: 'Pledged Patient',
        bloodGroup: 'B+',
        unitsNeeded: 3,
        unitsFulfilled: 1, // 1 received
        urgency: 'high',
        targetHospital: hosp.hospital._id.toString(),
        hospital: hosp.hospital._id.toString(),
        hospitalName: hosp.hospital.name,
        requester: hosp.user._id,
        status: 'partially_fulfilled',
      });

      // Donor pledges 1 unit
      await Donation.create({
        donor: donor.user._id,
        request: reqDoc._id.toString(),
        unitsDonated: 1,
        status: 'pledged',
      });

      // Min allowed = 1 received + 1 pledged = 2. Trying to set to 1 should fail.
      const res = await request(app)
        .patch(`/api/requests/${reqDoc._id}`)
        .set('Authorization', `Bearer ${hosp.token}`)
        .send({ unitsNeeded: 1 });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot be reduced below 2/i);
    });

    test('Successful edit logs editHistory, marks isEdited, and notifies pledged donors if urgency/units change', async () => {
      const hosp = await setupHospital();
      const donor = await setupDonor();

      const reqDoc = await BloodRequest.create({
        patientName: 'Initial Patient',
        bloodGroup: 'B+',
        unitsNeeded: 2,
        urgency: 'medium',
        targetHospital: hosp.hospital._id.toString(),
        hospital: hosp.hospital._id.toString(),
        hospitalName: hosp.hospital.name,
        requester: hosp.user._id,
        status: 'open',
      });

      await Donation.create({
        donor: donor.user._id,
        request: reqDoc._id.toString(),
        unitsDonated: 1,
        status: 'pledged',
      });

      const res = await request(app)
        .patch(`/api/requests/${reqDoc._id}`)
        .set('Authorization', `Bearer ${hosp.token}`)
        .send({
          patientName: 'Updated Patient Name',
          urgency: 'critical',
          unitsNeeded: 4,
          notes: 'Bed 402, urgent surgery',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.patientName).toBe('Updated Patient Name');
      expect(res.body.data.urgency).toBe('critical');
      expect(res.body.data.unitsNeeded).toBe(4);
      expect(res.body.data.isEdited).toBe(true);
      expect(res.body.data.editHistory.length).toBe(1);
      expect(res.body.data.editHistory[0].changedFields).toEqual(
        expect.arrayContaining(['patientName', 'urgency', 'unitsNeeded', 'notes'])
      );

      // Verify pledged donor received update notification
      const donorNotif = await Notification.findOne({ recipient: donor.user._id });
      expect(donorNotif).toBeDefined();
      expect(donorNotif.message).toMatch(/Request updated/i);
      expect(donorNotif.message).toMatch(/CRITICAL/i);
    });
  });

  describe('2. Request Cancellation & Donor Pledge Release', () => {
    test('Cancel with active pledges: cancels request, releases pledges, preserves donor stats & cooldown', async () => {
      const hosp = await setupHospital('City General Emergency Hospital');
      const donor = await setupDonor('Alex Rivera', 'B+');

      const initialLastDonation = donor.donorProfile.lastDonationDate || null;
      const initialCompleted = donor.donorProfile.completedDonations || 0;

      const reqDoc = await BloodRequest.create({
        patientName: 'Sharma',
        bloodGroup: 'B+',
        unitsNeeded: 2,
        urgency: 'critical',
        targetHospital: hosp.hospital._id.toString(),
        hospital: hosp.hospital._id.toString(),
        hospitalName: hosp.hospital.name,
        requester: hosp.user._id,
        status: 'open',
      });

      // Pledge
      const pledge = await Donation.create({
        donor: donor.user._id,
        request: reqDoc._id.toString(),
        unitsDonated: 1,
        status: 'pledged',
      });

      // Cancel request via API
      const cancelRes = await request(app)
        .post(`/api/requests/${reqDoc._id}/cancel`)
        .set('Authorization', `Bearer ${hosp.token}`)
        .send({
          reason: 'created_by_mistake',
          note: 'Doctor entered wrong requisition',
        });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.success).toBe(true);

      // Check request state
      const updatedReq = await BloodRequest.findById(reqDoc._id);
      expect(updatedReq.status).toBe('cancelled');
      expect(updatedReq.cancelReason).toBe('created_by_mistake');
      expect(updatedReq.cancelReasonLabel).toBe('Created by mistake');
      expect(updatedReq.cancelInternalNote).toBe('Doctor entered wrong requisition');
      expect(updatedReq.cancelledAt).toBeDefined();

      // Check pledge state
      const updatedPledge = await Donation.findById(pledge._id);
      expect(updatedPledge.status).toBe('released');
      expect(updatedPledge.releasedReason).toBe('request_cancelled');

      // Donor profile stats and cooldown must be unchanged
      const updatedDonor = await DonorProfile.findOne({ user: donor.user._id });
      expect(updatedDonor.lastDonationDate).toBe(initialLastDonation);
      expect(updatedDonor.completedDonations || 0).toBe(initialCompleted || 0);

      // Pledged donor notification text matches required template
      const donorNotif = await Notification.findOne({
        recipient: donor.user._id,
        title: 'Request Cancelled',
      });
      expect(donorNotif).toBeDefined();
      expect(donorNotif.message).toBe(
        `Request cancelled by ${hosp.hospital.name}. Sorry for the confusion - your pledge was released and your eligibility is unchanged. Thank you for being ready to help.`
      );

      // Donor can pledge again immediately on another request
      const anotherReq = await BloodRequest.create({
        patientName: 'Another Patient',
        bloodGroup: 'B+',
        unitsNeeded: 1,
        urgency: 'high',
        targetHospital: hosp.hospital._id.toString(),
        hospital: hosp.hospital._id.toString(),
        requester: hosp.user._id,
        status: 'open',
      });

      const pledgeRes = await request(app)
        .post(`/api/donations/pledge`)
        .set('Authorization', `Bearer ${donor.token}`)
        .send({
          requestId: anotherReq._id.toString(),
          units: 1,
        });

      expect(pledgeRes.status).toBe(201);
    });

    test('Cancelled request disappears from donor open lists and hospital active count', async () => {
      const hosp = await setupHospital();
      const donor = await setupDonor();

      const reqDoc = await BloodRequest.create({
        patientName: 'Cancelling Test',
        bloodGroup: 'B+',
        unitsNeeded: 1,
        unitsFromStock: 0,
        unitsFromDonors: 1,
        unitsFulfilled: 0,
        urgency: 'high',
        targetHospital: hosp.hospital._id,
        hospital: hosp.hospital._id,
        hospitalName: hosp.hospital.name,
        requester: hosp.user._id,
        status: 'open',
        address: 'City Clinic',
        location: { type: 'Point', coordinates: [77.209, 28.6139] },
      });

      // Prior to cancel, donor sees 1 open request
      const beforeDonorRes = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${donor.token}`);
      expect(beforeDonorRes.body.data.some((r) => r._id === reqDoc._id.toString())).toBe(true);

      // Cancel
      await request(app)
        .post(`/api/requests/${reqDoc._id}/cancel`)
        .set('Authorization', `Bearer ${hosp.token}`)
        .send({ reason: 'wrong_details' });

      // After cancel, donor open list does NOT contain it
      const afterDonorRes = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${donor.token}`);
      expect(afterDonorRes.body.data.some((r) => r._id === reqDoc._id.toString())).toBe(false);

      // Hospital default my requests list excludes cancelled requests unless includeAll=true
      const hospMyReqs = await request(app)
        .get('/api/requests/my')
        .set('Authorization', `Bearer ${hosp.token}`);
      expect(hospMyReqs.body.data.some((r) => r._id === reqDoc._id.toString())).toBe(false);

      const hospAllReqs = await request(app)
        .get('/api/requests/my?includeAll=true')
        .set('Authorization', `Bearer ${hosp.token}`);
      expect(hospAllReqs.body.data.some((r) => r._id === reqDoc._id.toString())).toBe(true);
    });

    test('Hospital stock returned and ledger record created on cancellation', async () => {
      const hosp = await setupHospital();

      // Request that had 1 unit allocated from stock
      const reqDoc = await BloodRequest.create({
        patientName: 'Stock Refund Test',
        bloodGroup: 'B+',
        unitsNeeded: 2,
        unitsFromStock: 1,
        unitsFromDonors: 1,
        urgency: 'high',
        targetHospital: hosp.hospital._id.toString(),
        hospital: hosp.hospital._id.toString(),
        requester: hosp.user._id,
        status: 'partially_fulfilled',
      });

      // Hospital initial stock of B+ is 2
      const initialStock = hosp.hospital.inventory.find((i) => i.bloodGroup === 'B+').units;

      await request(app)
        .post(`/api/requests/${reqDoc._id}/cancel`)
        .set('Authorization', `Bearer ${hosp.token}`)
        .send({ reason: 'patient_recovered' });

      const updatedHosp = await Hospital.findById(hosp.hospital._id);
      const updatedStock = updatedHosp.inventory.find((i) => i.bloodGroup === 'B+').units;
      expect(updatedStock).toBe(initialStock + 1);

      // Check InventoryTransaction ledger entry
      const ledgerEntry = await InventoryTransaction.findOne({
        hospital: hosp.hospital._id.toString(),
        reason: 'cancelled_request_returned',
      });
      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry.change).toBe(1);
    });

    test('Cancelling twice returns 409 conflict', async () => {
      const hosp = await setupHospital();
      const reqDoc = await BloodRequest.create({
        patientName: 'Double Cancel Test',
        bloodGroup: 'B+',
        unitsNeeded: 1,
        urgency: 'low',
        targetHospital: hosp.hospital._id.toString(),
        hospital: hosp.hospital._id.toString(),
        requester: hosp.user._id,
        status: 'open',
      });

      const first = await request(app)
        .post(`/api/requests/${reqDoc._id}/cancel`)
        .set('Authorization', `Bearer ${hosp.token}`)
        .send({ reason: 'created_by_mistake' });
      expect(first.status).toBe(200);

      const second = await request(app)
        .post(`/api/requests/${reqDoc._id}/cancel`)
        .set('Authorization', `Bearer ${hosp.token}`)
        .send({ reason: 'created_by_mistake' });
      expect(second.status).toBe(409);
      expect(second.body.message).toMatch(/already been cancelled/i);
    });

    test('Cannot cancel a request with fulfilled donations -> returns 409, close request works', async () => {
      const hosp = await setupHospital();
      const donor = await setupDonor();

      const reqDoc = await BloodRequest.create({
        patientName: 'Partially Fulfilled Patient',
        bloodGroup: 'B+',
        unitsNeeded: 2,
        unitsFulfilled: 1, // 1 unit already fulfilled
        urgency: 'critical',
        targetHospital: hosp.hospital._id.toString(),
        hospital: hosp.hospital._id.toString(),
        requester: hosp.user._id,
        status: 'partially_fulfilled',
      });

      // Pending pledge for the 2nd unit
      const pendingPledge = await Donation.create({
        donor: donor.user._id,
        request: reqDoc._id.toString(),
        unitsDonated: 1,
        status: 'pledged',
      });

      // Cancel should be blocked with 409
      const cancelRes = await request(app)
        .post(`/api/requests/${reqDoc._id}/cancel`)
        .set('Authorization', `Bearer ${hosp.token}`)
        .send({ reason: 'need_met_elsewhere' });

      expect(cancelRes.status).toBe(409);
      expect(cancelRes.body.message).toMatch(/close the request instead/i);

      // Close request works and releases remaining pending pledges
      const closeRes = await request(app)
        .post(`/api/requests/${reqDoc._id}/close`)
        .set('Authorization', `Bearer ${hosp.token}`)
        .send({ note: 'Remaining need met elsewhere' });

      expect(closeRes.status).toBe(200);
      expect(closeRes.body.data.status).toBe('closed');

      const releasedPledge = await Donation.findById(pendingPledge._id);
      expect(releasedPledge.status).toBe('released');
    });
  });

  describe('3. Undo-Create / Delete Request (< 5 min and 0 pledges)', () => {
    test('Undo-create within 5 minutes and 0 pledges hard deletes request and notifications', async () => {
      const hosp = await setupHospital();

      const reqDoc = await BloodRequest.create({
        patientName: 'Just Created Patient',
        bloodGroup: 'B+',
        unitsNeeded: 1,
        urgency: 'high',
        targetHospital: hosp.hospital._id.toString(),
        hospital: hosp.hospital._id.toString(),
        requester: hosp.user._id,
        status: 'open',
        createdAt: new Date(),
      });

      const notif = await Notification.create({
        recipient: hosp.user._id,
        title: 'Emergency Request Created',
        message: 'Broadcast started',
        link: `/requests/${reqDoc._id}`,
      });

      const delRes = await request(app)
        .delete(`/api/requests/${reqDoc._id}`)
        .set('Authorization', `Bearer ${hosp.token}`);

      expect(delRes.status).toBe(200);

      const checkReq = await BloodRequest.findById(reqDoc._id);
      expect(checkReq).toBeNull();

      const checkNotif = await Notification.findById(notif._id);
      expect(checkNotif).toBeNull();
    });

    test('Undo-create fails if request has donor pledges (returns 400)', async () => {
      const hosp = await setupHospital();
      const donor = await setupDonor();

      const reqDoc = await BloodRequest.create({
        patientName: 'Quick Pledged Patient',
        bloodGroup: 'B+',
        unitsNeeded: 1,
        urgency: 'high',
        targetHospital: hosp.hospital._id.toString(),
        hospital: hosp.hospital._id.toString(),
        requester: hosp.user._id,
        status: 'open',
        createdAt: new Date(),
      });

      await Donation.create({
        donor: donor.user._id,
        request: reqDoc._id.toString(),
        unitsDonated: 1,
        status: 'pledged',
      });

      const delRes = await request(app)
        .delete(`/api/requests/${reqDoc._id}`)
        .set('Authorization', `Bearer ${hosp.token}`);

      expect(delRes.status).toBe(400);
      expect(delRes.body.message).toMatch(/cannot be deleted/i);
    });

    test('Undo-create fails if request was created more than 5 minutes ago (returns 400)', async () => {
      const hosp = await setupHospital();

      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
      const reqDoc = await BloodRequest.create({
        patientName: 'Older Patient',
        bloodGroup: 'B+',
        unitsNeeded: 1,
        urgency: 'high',
        targetHospital: hosp.hospital._id.toString(),
        hospital: hosp.hospital._id.toString(),
        requester: hosp.user._id,
        status: 'open',
        createdAt: sixMinutesAgo,
      });

      const delRes = await request(app)
        .delete(`/api/requests/${reqDoc._id}`)
        .set('Authorization', `Bearer ${hosp.token}`);

      expect(delRes.status).toBe(400);
      expect(delRes.body.message).toMatch(/cannot be deleted/i);
    });
  });

  describe('4. Firestore Reads-Before-Writes Spy for Cancel and Edit', () => {
    test('Cancel transaction strictly follows read-then-write ordering', async () => {
      const hosp = await setupHospital();
      const donor = await setupDonor();

      const reqDoc = await BloodRequest.create({
        patientName: 'Transaction Spy Patient',
        bloodGroup: 'B+',
        unitsNeeded: 2,
        unitsFromStock: 1,
        unitsFromDonors: 1,
        urgency: 'high',
        targetHospital: hosp.hospital._id.toString(),
        hospital: hosp.hospital._id.toString(),
        requester: hosp.user._id,
        status: 'partially_fulfilled',
      });

      await Donation.create({
        donor: donor.user._id,
        request: reqDoc._id.toString(),
        unitsDonated: 1,
        status: 'pledged',
      });

      const db = getDb();
      const originalRunTransaction = db.runTransaction.bind(db);

      let writeOccurred = false;
      let readAfterWriteDetected = false;

      db.runTransaction = async (updateFunction) => {
        return originalRunTransaction(async (transaction) => {
          const originalGet = transaction.get.bind(transaction);
          const originalSet = transaction.set.bind(transaction);
          const originalUpdate = transaction.update.bind(transaction);
          const originalDelete = transaction.delete.bind(transaction);

          transaction.get = async (...args) => {
            if (writeOccurred) {
              readAfterWriteDetected = true;
            }
            return originalGet(...args);
          };

          transaction.set = (...args) => {
            writeOccurred = true;
            return originalSet(...args);
          };

          transaction.update = (...args) => {
            writeOccurred = true;
            return originalUpdate(...args);
          };

          transaction.delete = (...args) => {
            writeOccurred = true;
            return originalDelete(...args);
          };

          return updateFunction(transaction);
        });
      };

      try {
        const cancelRes = await request(app)
          .post(`/api/requests/${reqDoc._id}/cancel`)
          .set('Authorization', `Bearer ${hosp.token}`)
          .send({ reason: 'wrong_details' });

        expect(cancelRes.status).toBe(200);
        expect(writeOccurred).toBe(true);
        expect(readAfterWriteDetected).toBe(false);
      } finally {
        db.runTransaction = originalRunTransaction;
      }
    });
  });

  describe('5. AI Assistant Parity & Cancellation Help', () => {
    test('AI tool getCancelledRequests returns accurate count and excludes cancelled from active requests', async () => {
      const hosp = await setupHospital('City General Emergency Hospital');

      // Create 1 active request and 1 cancelled request
      await BloodRequest.create({
        patientName: 'Active Patient',
        bloodGroup: 'B+',
        unitsNeeded: 2,
        urgency: 'high',
        targetHospital: hosp.hospital._id.toString(),
        hospital: hosp.hospital._id.toString(),
        requester: hosp.user._id,
        status: 'open',
      });

      const reqCancelled = await BloodRequest.create({
        patientName: 'Cancelled Patient',
        bloodGroup: 'O-',
        unitsNeeded: 1,
        urgency: 'critical',
        targetHospital: hosp.hospital._id.toString(),
        hospital: hosp.hospital._id.toString(),
        requester: hosp.user._id,
        status: 'cancelled',
        cancelReason: 'created_by_mistake',
        cancelReasonLabel: 'Created by mistake',
      });

      // AI tool getActiveRequests count should be 1, NOT 2
      const activeResult = await hospitalAiTools.getActiveRequests({
        userId: hosp.user._id,
        user: hosp.user,
        role: 'hospital',
      });
      expect(activeResult.totalActive).toBe(1);
      expect(activeResult.activeRequests[0].patientName).toBe('Active Patient');

      // AI tool getCancelledRequests count should be 1
      const cancelledResult = await hospitalAiTools.getCancelledRequests({
        userId: hosp.user._id,
        user: hosp.user,
        role: 'hospital',
      });
      expect(cancelledResult.cancelledCount).toBe(1);
      expect(cancelledResult.requests[0].patientName).toBe('Cancelled Patient');
    });

    test('Keyword router responds with instructions and navigation for "how do I cancel a request"', async () => {
      const hosp = await setupHospital();

      const response = await keywordRouter.routeWithKeywords('how do I cancel a blood request?', {
        user: hosp.user,
        role: 'hospital',
      });

      expect(response).toBeDefined();
      expect(response.reply).toMatch(/cancel/i);
      expect(response.reply).toMatch(/Active Requests/i);
      expect(response.actions).toBeDefined();
      expect(response.actions.some((a) => a.tab === 'active-requests' || (a.url && a.url.includes('tab=active')))).toBe(true);
    });
  });
});

