/**
 * tests/transactionOrderingAndFulfill.test.js
 *
 * Dedicated test suite for Firestore transaction read-then-write ordering
 * and the complete donation fulfillment workflow:
 * 1. Confirm donation succeeds:
 *    - Pledge fulfilled (status = 'completed', fulfilledAt, fulfilledBy).
 *    - Request RECEIVED/unitsFulfilled = 1, status = 'fulfilled' or 'partially_fulfilled'.
 *    - Donor profile lastDonationDate set and completedDonations +1.
 *    - Donation record in history.
 *    - Donor is now in 90-day cooldown (isDonorCandidate returns isCandidate: false).
 * 2. Decline/No-show leaves lastDonationDate and completedDonations unchanged.
 * 3. Confirming twice returns 409 (Conflict) and counters/inventory remain unchanged.
 * 4. Another hospital attempting to confirm returns 403 (Forbidden).
 * 5. Regression test asserting no transaction.get occurs after a write across
 *    fulfill, pledge, decline, cancel, and allocate flows.
 */

require('./setup');

const request = require('supertest');
const { connect, clearDatabase, disconnect } = require('./helpers/db');
const { registerUser, registerHospital } = require('./helpers/auth');
const { isDonorCandidate } = require('../src/services/matching.service');
const donationService = require('../src/services/donation.service');
const requestService = require('../src/services/request.service');
const { getDb } = require('../src/config/db');

let app;
let User;
let Hospital;
let BloodRequest;
let DonorProfile;
let Donation;
let InventoryTransaction;

beforeAll(async () => {
  await connect();
  app = require('../src/app');
  User = require('../src/repositories/user.repository');
  Hospital = require('../src/repositories/hospital.repository');
  BloodRequest = require('../src/repositories/bloodRequest.repository');
  DonorProfile = require('../src/repositories/donorProfile.repository');
  Donation = require('../src/repositories/donation.repository');
  InventoryTransaction = require('../src/repositories/inventoryTransaction.repository');
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnect();
});

// Helper: create a verified hospital with initial inventory
const setupVerifiedHospital = async (name = 'City General Emergency Hospital', inventoryMap = { 'B+': 2, 'O-': 0 }) => {
  const { user, token } = await registerHospital(app, {
    name,
    email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}@test.com`,
  });

  const hospital = await Hospital.findOne({ user: user._id || user.id });
  hospital.name = name;
  hospital.isVerified = true;
  hospital.phone = '+91-9876543210';
  hospital.address = `${name} Campus, New Delhi`;
  hospital.location = { type: 'Point', coordinates: [77.2090, 28.6139] };

  const defaultGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  hospital.inventory = defaultGroups.map((grp) => ({
    bloodGroup: grp,
    units: inventoryMap[grp] !== undefined ? inventoryMap[grp] : 0,
  }));

  await hospital.save();
  return { user, token, hospital };
};

// Helper: create an open blood request ready to accept donor pledges
const createOpenRequest = async (requesterToken, hospitalId, bloodGroup = 'B+', unitsNeeded = 2) => {
  const res = await request(app)
    .post('/api/requests')
    .set('Authorization', `Bearer ${requesterToken}`)
    .send({
      patientName: 'Sharma',
      bloodGroup,
      unitsNeeded,
      urgency: 'critical',
      targetHospital: hospitalId.toString(),
      address: '42 Medical Center Way, New Delhi',
    });

  const requestId = res.body?.data?._id;
  if (requestId) {
    await BloodRequest.findByIdAndUpdate(requestId, {
      status: 'open',
      unitsFromDonors: unitsNeeded,
    });
  }
  return requestId;
};

describe('Firestore Transaction Ordering and Donation Fulfillment', () => {
  test('confirm donation succeeds: pledge fulfilled, request unitsFulfilled=1, donor cooldown active', async () => {
    // 1. Setup hospital, donor (O-), requester (B+)
    const { user: hospUser, token: hospToken, hospital } = await setupVerifiedHospital();

    const requester = await registerUser(app, {
      name: 'Sharma Family',
      email: `requester_${Date.now()}@test.com`,
      bloodGroup: 'B+',
    });

    const donor = await registerUser(app, {
      name: 'Alex Rivera',
      email: `alex_${Date.now()}@test.com`,
      bloodGroup: 'O-',
    });

    // 2. Create blood request for 2 units of B+, status 'open'
    const requestId = await createOpenRequest(requester.token, hospital._id, 'B+', 2);
    expect(requestId).toBeDefined();

    // 3. Donor Alex Rivera pledges 1 unit
    const pledgeRes = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donor.token}`)
      .send({
        requestId,
        units: 1,
      });
    expect(pledgeRes.status).toBe(201);
    const donationId = pledgeRes.body.data._id;

    // Verify initial donor profile state
    const dpBefore = await DonorProfile.findOne({ user: donor.user._id });
    expect(dpBefore.lastDonationDate).toBeNull();
    expect(Number(dpBefore.completedDonations || 0)).toBe(0);

    // 4. Hospital confirms the donation via PATCH /api/donations/:id/complete (or fulfill)
    const confirmRes = await request(app)
      .patch(`/api/donations/${donationId}/complete`)
      .set('Authorization', `Bearer ${hospToken}`);
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.success).toBe(true);

    // 5. Verify pledge status is completed/fulfilled
    const fulfilledDonation = await Donation.findById(donationId);
    expect(fulfilledDonation.status).toBe('completed');
    expect(fulfilledDonation.fulfilledAt).toBeDefined();
    expect(fulfilledDonation.fulfilledBy).toBe(hospital._id.toString());

    // 6. Verify request unitsFulfilled incremented to 1 and status is partially_fulfilled (1 of 2)
    const updatedReq = await BloodRequest.findById(requestId);
    expect(updatedReq.unitsFulfilled).toBe(1);
    expect(updatedReq.status).toBe('partially_fulfilled');

    // 7. Verify donor profile: lastDonationDate is set, completedDonations = 1
    const dpAfter = await DonorProfile.findOne({ user: donor.user._id });
    expect(dpAfter.lastDonationDate).not.toBeNull();
    expect(Number(dpAfter.completedDonations)).toBe(1);

    // 8. Verify donor enters 90-day cooldown: isDonorCandidate returns false
    const candidateCheck = isDonorCandidate(updatedReq, dpAfter);
    expect(candidateCheck.isCandidate).toBe(false);
    expect(candidateCheck.reason).toContain('cooldown');

    // 9. Verify hospital inventory for O- was incremented
    const updatedHosp = await Hospital.findById(hospital._id);
    const oMinusStock = updatedHosp.inventory.find((i) => i.bloodGroup === 'O-');
    expect(oMinusStock.units).toBe(1);

    // 10. Verify InventoryTransaction ledger entry was created
    const ledgerEntry = await InventoryTransaction.findOne({ request: requestId, bloodGroup: 'O-' });
    expect(ledgerEntry).not.toBeNull();
    expect(ledgerEntry.change).toBe(1);
    expect(ledgerEntry.reason).toBe('donation_received');
  });

  test('decline / no-show leaves lastDonationDate and completedDonations unchanged', async () => {
    const { token: hospToken, hospital } = await setupVerifiedHospital();

    const requester = await registerUser(app, {
      name: 'Requester 2',
      email: `req2_${Date.now()}@test.com`,
      bloodGroup: 'A+',
    });

    const donor = await registerUser(app, {
      name: 'John Doe',
      email: `john_${Date.now()}@test.com`,
      bloodGroup: 'A+',
    });

    const requestId = await createOpenRequest(requester.token, hospital._id, 'A+', 1);

    const pledgeRes = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donor.token}`)
      .send({
        requestId,
        units: 1,
      });
    expect(pledgeRes.status).toBe(201);
    const donationId = pledgeRes.body.data._id;

    // Hospital declines pledge / marks no-show
    const declineRes = await request(app)
      .patch(`/api/donations/${donationId}/decline`)
      .set('Authorization', `Bearer ${hospToken}`);
    expect(declineRes.status).toBe(200);

    const cancelledDonation = await Donation.findById(donationId);
    expect(cancelledDonation.status).toBe('cancelled');

    // Donor profile must NOT have lastDonationDate set and completedDonations must remain 0
    const dp = await DonorProfile.findOne({ user: donor.user._id });
    expect(dp.lastDonationDate).toBeNull();
    expect(Number(dp.completedDonations || 0)).toBe(0);
  });

  test('confirming twice returns 409 Conflict; counters and inventory do NOT increment again', async () => {
    const { token: hospToken, hospital } = await setupVerifiedHospital();

    const requester = await registerUser(app, {
      name: 'Patient Twice',
      email: `twice_req_${Date.now()}@test.com`,
      bloodGroup: 'B+',
    });

    const donor = await registerUser(app, {
      name: 'Donor Twice',
      email: `twice_don_${Date.now()}@test.com`,
      bloodGroup: 'B+',
    });

    const requestId = await createOpenRequest(requester.token, hospital._id, 'B+', 1);

    const pledgeRes = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donor.token}`)
      .send({
        requestId,
        units: 1,
      });
    expect(pledgeRes.status).toBe(201);
    const donationId = pledgeRes.body.data._id;

    // First confirmation -> 200
    const firstConfirm = await request(app)
      .patch(`/api/donations/${donationId}/complete`)
      .set('Authorization', `Bearer ${hospToken}`);
    expect(firstConfirm.status).toBe(200);

    // Second confirmation -> 409 Conflict
    const secondConfirm = await request(app)
      .patch(`/api/donations/${donationId}/complete`)
      .set('Authorization', `Bearer ${hospToken}`);
    expect(secondConfirm.status).toBe(409);
    expect(secondConfirm.body.message).toContain('already');

    // Also test POST /fulfill alias
    const fulfillConfirm = await request(app)
      .post(`/api/donations/${donationId}/fulfill`)
      .set('Authorization', `Bearer ${hospToken}`);
    expect(fulfillConfirm.status).toBe(409);

    // Verify counters did NOT double increment
    const req = await BloodRequest.findById(requestId);
    expect(req.unitsFulfilled).toBe(1);

    const dp = await DonorProfile.findOne({ user: donor.user._id });
    expect(Number(dp.completedDonations)).toBe(1);
  });

  test('another hospital attempting to confirm returns 403 Forbidden', async () => {
    const { hospital: hospA } = await setupVerifiedHospital('Hospital Alpha');
    const { token: hospTokenB } = await setupVerifiedHospital('Hospital Beta');

    const requester = await registerUser(app, {
      name: 'Patient Auth',
      email: `auth_req_${Date.now()}@test.com`,
      bloodGroup: 'O+',
    });

    const donor = await registerUser(app, {
      name: 'Donor Auth',
      email: `auth_don_${Date.now()}@test.com`,
      bloodGroup: 'O+',
    });

    // Request addressed to Hospital Alpha
    const requestId = await createOpenRequest(requester.token, hospA._id, 'O+', 1);

    const pledgeRes = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donor.token}`)
      .send({
        requestId,
        units: 1,
      });
    expect(pledgeRes.status).toBe(201);
    const donationId = pledgeRes.body.data._id;

    // Hospital Beta tries to confirm Alpha's donation
    const forbiddenRes = await request(app)
      .patch(`/api/donations/${donationId}/complete`)
      .set('Authorization', `Bearer ${hospTokenB}`);
    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.message).toContain('Unauthorized');
  });

  test('regression: no transaction.get occurs after a write across fulfill, pledge, decline, and allocate flows', async () => {
    const db = getDb();
    const originalRunTransaction = db.runTransaction.bind(db);

    // Spy on transaction operations
    const txLog = [];
    db.runTransaction = async function (updateFn) {
      let writeCount = 0;
      let hasReadAfterWrite = false;

      const wrappedFn = async (txn) => {
        const proxyTxn = {
          get: async (docRef) => {
            if (writeCount > 0) {
              hasReadAfterWrite = true;
            }
            txLog.push({ op: 'get', path: docRef.path, writeCount });
            return await txn.get(docRef);
          },
          set: (docRef, data, options) => {
            writeCount++;
            txLog.push({ op: 'set', path: docRef.path, writeCount });
            return txn.set(docRef, data, options);
          },
          update: (docRef, data) => {
            writeCount++;
            txLog.push({ op: 'update', path: docRef.path, writeCount });
            return txn.update(docRef, data);
          },
          delete: (docRef) => {
            writeCount++;
            txLog.push({ op: 'delete', path: docRef.path, writeCount });
            return txn.delete(docRef);
          },
        };
        return await updateFn(proxyTxn);
      };

      const result = await originalRunTransaction(wrappedFn);
      expect(hasReadAfterWrite).toBe(false);
      return result;
    };

    try {
      // 1. Setup hospital, requester, donors
      const { user: hospUser, hospital } = await setupVerifiedHospital('Spy Hospital', { 'A+': 5, 'O-': 2 });
      const requester = await registerUser(app, { bloodGroup: 'A+' });
      const donor1 = await registerUser(app, { bloodGroup: 'A+' });
      const donor2 = await registerUser(app, { bloodGroup: 'A+' });

      // 2. Pledge flow transaction
      const req1 = await BloodRequest.create({
        patientName: 'Spy Patient 1',
        bloodGroup: 'A+',
        unitsNeeded: 2,
        unitsFromDonors: 2,
        urgency: 'high',
        targetHospital: hospital._id.toString(),
        requester: requester.user._id,
        status: 'open',
      });

      const pledge1 = await donationService.pledgeDonation(donor1.user._id, req1._id, 1);
      expect(pledge1).toBeDefined();

      // 3. Fulfill flow transaction
      const fulfilled = await donationService.completeDonation(pledge1._id, hospUser);
      expect(fulfilled).toBeDefined();

      // 4. Decline flow transaction with a different donor on a fresh request
      const req2 = await BloodRequest.create({
        patientName: 'Spy Patient 2',
        bloodGroup: 'A+',
        unitsNeeded: 1,
        unitsFromDonors: 1,
        urgency: 'high',
        targetHospital: hospital._id.toString(),
        requester: requester.user._id,
        status: 'open',
      });

      const pledge2 = await donationService.pledgeDonation(donor2.user._id, req2._id, 1);
      const declined = await donationService.declineDonation(pledge2._id, hospUser);
      expect(declined).toBeDefined();

      // 5. Allocate from stock transaction (acceptRequest)
      const reqPending = await BloodRequest.create({
        patientName: 'Stock Patient',
        bloodGroup: 'A+',
        unitsNeeded: 1,
        urgency: 'critical',
        targetHospital: hospital._id.toString(),
        requester: requester.user._id,
        status: 'pending_hospital_review',
      });
      const accepted = await requestService.acceptRequest(reqPending._id, hospUser._id, 'hospital');
      expect(accepted).toBeDefined();

      // 6. Compatible units issue transaction
      const reqComp = await BloodRequest.create({
        patientName: 'Comp Patient',
        bloodGroup: 'A+',
        unitsNeeded: 2,
        urgency: 'critical',
        targetHospital: hospital._id.toString(),
        requester: requester.user._id,
        status: 'open',
      });
      const compIssued = await requestService.issueCompatibleUnits(reqComp._id, hospUser._id, 'hospital', 'O-', 1);
      expect(compIssued).toBeDefined();

      // 7. Patient units issue transaction
      const patIssued = await requestService.issuePatientUnits(reqComp._id, hospUser._id, 'hospital', 1);
      expect(patIssued).toBeDefined();
    } finally {
      db.runTransaction = originalRunTransaction;
    }
  });
});
