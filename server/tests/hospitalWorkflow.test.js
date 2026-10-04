/**
 * tests/hospitalWorkflow.test.js
 *
 * Automated integration tests for the LifeLink Hospital-First Emergency Blood Request Flow:
 * 1. Request to Hospital A is NOT visible to Hospital B (returns 403 or empty).
 * 2. Unverified hospital cannot be selected (returns 400).
 * 3. Request creates with status pending_hospital_review; donors are NOT notified before accept.
 * 4. Hospital A accepts request:
 *    - Case A: Hospital has 3 units, request asks for 2 -> stock becomes 1, unitsFromStock=2, unitsFromDonors=0, status=fulfilled, donors never notified.
 *    - Case B: Hospital has 1 unit, request asks for 3 -> stock becomes 0, unitsFromStock=1, unitsFromDonors=2, status=partially_fulfilled, matching donors notified for 2 units only.
 *    - Case C: Hospital has 0 units -> stock stays 0, unitsFromStock=0, unitsFromDonors=3, status=open, matching donors notified for all 3.
 * 5. Atomic check: two concurrent requests for 1 unit when stock is 1 -> exactly one gets the unit, the other gets 0. Stock never goes negative.
 * 6. Compatible units: Hospital accepts request for AB+ using 1 unit of A+ and 1 unit of B+ from stock -> stock of A+ and B+ decrements, request fulfilled. Incompatible group rejected with 400.
 * 7. Confirm donation: Donor pledges to request, hospital confirms -> ONLY that hospital's stock increases (+1), donor's lastDonationDate updates, InventoryTransaction logged. Other hospital's stock untouched.
 * 8. Requester cannot match own request: User creates request, same user is registered as donor -> matching engine does NOT include requester in candidate list.
 * 9. Timeout: Critical request pending > 15 min -> status becomes hospital_no_response when checked.
 */

require('./setup');

const request = require('supertest');
const mongoose = require('mongoose');
const { connect, clearDatabase, disconnect } = require('./helpers/db');
const { registerUser, registerHospital } = require('./helpers/auth');

let app;
let User;
let Hospital;
let BloodRequest;
let DonorProfile;
let Donation;
let Notification;
let InventoryTransaction;

beforeAll(async () => {
  await connect();
  app = require('../src/app');
  User = require('../src/models/User');
  Hospital = require('../src/models/Hospital');
  BloodRequest = require('../src/models/BloodRequest');
  DonorProfile = require('../src/models/DonorProfile');
  Donation = require('../src/models/Donation');
  Notification = require('../src/models/Notification');
  InventoryTransaction = require('../src/models/InventoryTransaction');
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnect();
});

// ── Test Helpers ─────────────────────────────────────────────────────────────

const createVerifiedHospital = async (name, inventoryMap = {}) => {
  const { user, token } = await registerHospital(app, {
    name,
    email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}@test.com`,
  });

  const hospital = await Hospital.findOne({ user: user._id || user.id });
  hospital.name = name;
  hospital.isVerified = true;
  hospital.phone = '+91-9876543210';
  hospital.address = `${name} Campus, New Delhi`;
  hospital.location = {
    type: 'Point',
    coordinates: [77.2090, 28.6139],
  };

  const defaultGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  hospital.inventory = defaultGroups.map((grp) => ({
    bloodGroup: grp,
    units: inventoryMap[grp] !== undefined ? inventoryMap[grp] : 0,
  }));

  await hospital.save();
  return { user, token, hospital };
};

const createUnverifiedHospital = async (name) => {
  const { user, token } = await registerHospital(app, {
    name,
    email: `unverified_${Date.now()}@test.com`,
  });
  const hospital = await Hospital.findOne({ user: user._id || user.id });
  hospital.isVerified = false;
  await hospital.save();
  return { user, token, hospital };
};

const createCandidateDonor = async (bloodGroup = 'B+', coordinates = [77.2100, 28.6140]) => {
  const { user, token } = await registerUser(app, {
    bloodGroup,
    email: `donor_${bloodGroup.toLowerCase().replace('+', 'pos').replace('-', 'neg')}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
  });
  const donorProfile = await DonorProfile.findOne({ user: user._id || user.id });
  donorProfile.isAvailable = true;
  donorProfile.bloodGroup = bloodGroup;
  donorProfile.location = {
    type: 'Point',
    coordinates,
  };
  await donorProfile.save();
  return { user, token, donorProfile };
};

// ── Requirement 1: Hospital Isolation ────────────────────────────────────────

describe('1. Hospital Isolation', () => {
  test('Request addressed to Hospital A is NOT accessible to Hospital B (returns 403) and omitted from Hospital B incoming queue', async () => {
    const hospitalA = await createVerifiedHospital('City Hospital Alpha');
    const hospitalB = await createVerifiedHospital('Metro Hospital Beta');
    const patientUser = await registerUser(app);

    // Patient sends emergency request to Hospital A
    const reqRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${patientUser.token}`)
      .send({
        patientName: 'Jane Doe',
        bloodGroup: 'B+',
        unitsNeeded: 2,
        urgency: 'high',
        targetHospital: hospitalA.hospital._id.toString(),
      });

    expect(reqRes.status).toBe(201);
    const requestId = reqRes.body.data._id;

    // Hospital A can view it
    const viewResA = await request(app)
      .get(`/api/requests/${requestId}`)
      .set('Authorization', `Bearer ${hospitalA.token}`);
    expect(viewResA.status).toBe(200);

    // Hospital B calls GET /api/requests/:id -> must be forbidden (403)
    const viewResB = await request(app)
      .get(`/api/requests/${requestId}`)
      .set('Authorization', `Bearer ${hospitalB.token}`);
    expect(viewResB.status).toBe(403);
    expect(viewResB.body.success).toBe(false);

    // Hospital B's incoming queue does NOT list Hospital A's request
    const incomingResB = await request(app)
      .get('/api/requests/hospital/incoming')
      .set('Authorization', `Bearer ${hospitalB.token}`);
    expect(incomingResB.status).toBe(200);
    const bRequestIds = incomingResB.body.data.map((r) => r._id.toString());
    expect(bRequestIds).not.toContain(requestId.toString());
  });
});

// ── Requirement 2: Unverified Hospital Validation ────────────────────────────

describe('2. Unverified Hospital Selection Blocked', () => {
  test('User cannot select an unverified hospital (returns 400)', async () => {
    const unverifiedHospital = await createUnverifiedHospital('Unapproved Clinic');
    const patientUser = await registerUser(app);

    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${patientUser.token}`)
      .send({
        patientName: 'Alex Smith',
        bloodGroup: 'O+',
        unitsNeeded: 1,
        urgency: 'critical',
        targetHospital: unverifiedHospital.hospital._id.toString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/verified/i);
  });
});

// ── Requirement 3: Initial Status & No Pre-Accept Notifications ──────────────

describe('3. Request Initial Status & No Notifications Prior to Hospital Acceptance', () => {
  test('Created request starts in pending_hospital_review; donors are NOT notified prior to hospital accept', async () => {
    const hospitalA = await createVerifiedHospital('Apex Medical Center', { 'B+': 0 });
    // Seed 2 candidate donors with B+
    const donor1 = await createCandidateDonor('B+');
    const donor2 = await createCandidateDonor('B+');

    const patientUser = await registerUser(app);

    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${patientUser.token}`)
      .send({
        patientName: 'Rachel Green',
        bloodGroup: 'B+',
        unitsNeeded: 2,
        urgency: 'high',
        targetHospital: hospitalA.hospital._id.toString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending_hospital_review');

    // Confirm zero notifications were sent to donors at creation time
    const donorUserIds = [donor1.user._id, donor2.user._id];
    const donorNotifCount = await Notification.countDocuments({
      recipient: { $in: donorUserIds },
    });
    expect(donorNotifCount).toBe(0);
  });
});

// ── Requirement 4: Hospital A Accepts Request (Cases A, B, C) ────────────────

describe('4. Hospital Review and Stock Allocation', () => {
  test('Case A: Full stock available -> 100% from stock, request fulfilled, donors never notified', async () => {
    // Hospital has 3 units of B+
    const hospitalA = await createVerifiedHospital('Central General Hospital', { 'B+': 3 });
    // Seed a nearby donor
    const donor = await createCandidateDonor('B+');

    const patientUser = await registerUser(app);
    const reqRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${patientUser.token}`)
      .send({
        patientName: 'Tom Hardy',
        bloodGroup: 'B+',
        unitsNeeded: 2,
        urgency: 'critical',
        targetHospital: hospitalA.hospital._id.toString(),
      });

    const requestId = reqRes.body.data._id;

    // Hospital A accepts request
    const acceptRes = await request(app)
      .patch(`/api/requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${hospitalA.token}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.unitsFromStock).toBe(2);
    expect(acceptRes.body.data.unitsFromDonors).toBe(0);
    expect(acceptRes.body.data.status).toBe('fulfilled');

    // Hospital stock becomes 3 - 2 = 1
    const updatedHosp = await Hospital.findById(hospitalA.hospital._id);
    const bPosStock = updatedHosp.inventory.find((i) => i.bloodGroup === 'B+').units;
    expect(bPosStock).toBe(1);

    // Donors must NOT have received any notifications
    const donorNotifs = await Notification.countDocuments({
      recipient: donor.user._id,
    });
    expect(donorNotifs).toBe(0);
  });

  test('Case B: Partial stock available -> available issued, shortfall opened to donors, matching donors notified for shortfall only', async () => {
    // Hospital has 1 unit of B+
    const hospitalA = await createVerifiedHospital('Mercy Hospital', { 'B+': 1 });
    const donor = await createCandidateDonor('B+');

    const patientUser = await registerUser(app);
    const reqRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${patientUser.token}`)
      .send({
        patientName: 'Bruce Wayne',
        bloodGroup: 'B+',
        unitsNeeded: 3,
        urgency: 'critical',
        targetHospital: hospitalA.hospital._id.toString(),
      });

    const requestId = reqRes.body.data._id;

    // Hospital A accepts request
    const acceptRes = await request(app)
      .patch(`/api/requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${hospitalA.token}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.unitsFromStock).toBe(1);
    expect(acceptRes.body.data.unitsFromDonors).toBe(2); // 3 - 1 = 2 shortfall
    expect(acceptRes.body.data.status).toBe('partially_fulfilled');

    // Hospital stock becomes 0
    const updatedHosp = await Hospital.findById(hospitalA.hospital._id);
    const bPosStock = updatedHosp.inventory.find((i) => i.bloodGroup === 'B+').units;
    expect(bPosStock).toBe(0);

    // Matching donor received notification for the 2 units shortfall
    const donorNotif = await Notification.findOne({
      recipient: donor.user._id,
    });
    expect(donorNotif).not.toBeNull();
    expect(donorNotif.message).toMatch(/2 unit\(s\)/);
  });

  test('Case C: Zero stock available -> 0 from stock, all 3 units broadcast to donors, status=open', async () => {
    // Hospital has 0 units of B+
    const hospitalA = await createVerifiedHospital('StJude Hospital', { 'B+': 0 });
    const donor = await createCandidateDonor('B+');

    const patientUser = await registerUser(app);
    const reqRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${patientUser.token}`)
      .send({
        patientName: 'Clark Kent',
        bloodGroup: 'B+',
        unitsNeeded: 3,
        urgency: 'high',
        targetHospital: hospitalA.hospital._id.toString(),
      });

    expect(reqRes.status).toBe(201);
    const requestId = reqRes.body.data._id;

    // Hospital A accepts request
    const acceptRes = await request(app)
      .patch(`/api/requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${hospitalA.token}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.unitsFromStock).toBe(0);
    expect(acceptRes.body.data.unitsFromDonors).toBe(3);
    expect(acceptRes.body.data.status).toBe('open');

    // Hospital stock stays 0
    const updatedHosp = await Hospital.findById(hospitalA.hospital._id);
    const bPosStock = updatedHosp.inventory.find((i) => i.bloodGroup === 'B+').units;
    expect(bPosStock).toBe(0);

    // Matching donor received notification for all 3 units
    const donorNotif = await Notification.findOne({
      recipient: donor.user._id,
    });
    expect(donorNotif).not.toBeNull();
    expect(donorNotif.message).toMatch(/3 unit\(s\)/);
  });
});

// ── Requirement 5: Atomic Concurrency Check (No Negative Stock) ──────────────

describe('5. Atomic Stock Deduction & Concurrency Guarantee', () => {
  test('Two concurrent requests for 1 unit when stock is 1 -> exactly one gets unit, other gets 0, stock never goes negative', async () => {
    // Exactly 1 unit in hospital inventory
    const hospitalA = await createVerifiedHospital('Unity Hospital', { 'O-': 1 });

    const user1 = await registerUser(app);
    const user2 = await registerUser(app);

    const [req1Res, req2Res] = await Promise.all([
      request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({
          patientName: 'Patient One',
          bloodGroup: 'O-',
          unitsNeeded: 1,
          urgency: 'critical',
          targetHospital: hospitalA.hospital._id.toString(),
        }),
      request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${user2.token}`)
        .send({
          patientName: 'Patient Two',
          bloodGroup: 'O-',
          unitsNeeded: 1,
          urgency: 'critical',
          targetHospital: hospitalA.hospital._id.toString(),
        }),
    ]);

    expect(req1Res.status).toBe(201);
    expect(req2Res.status).toBe(201);

    const reqId1 = req1Res.body.data._id;
    const reqId2 = req2Res.body.data._id;

    // Both requests are accepted simultaneously
    const [accept1, accept2] = await Promise.all([
      request(app)
        .patch(`/api/requests/${reqId1}/accept`)
        .set('Authorization', `Bearer ${hospitalA.token}`),
      request(app)
        .patch(`/api/requests/${reqId2}/accept`)
        .set('Authorization', `Bearer ${hospitalA.token}`),
    ]);

    expect(accept1.status).toBe(200);
    expect(accept2.status).toBe(200);

    const fromStock1 = accept1.body.data.unitsFromStock;
    const fromStock2 = accept2.body.data.unitsFromStock;

    // Exactly one must get 1 unit from stock, the other gets 0
    expect(fromStock1 + fromStock2).toBe(1);
    expect([fromStock1, fromStock2].sort()).toEqual([0, 1]);

    // Final hospital inventory MUST be exactly 0 (never negative)
    const updatedHosp = await Hospital.findById(hospitalA.hospital._id);
    const finalStock = updatedHosp.inventory.find((i) => i.bloodGroup === 'O-').units;
    expect(finalStock).toBe(0);
    expect(finalStock).toBeGreaterThanOrEqual(0);
  });
});

// ── Requirement 6: Compatible Blood Units Fulfillment ────────────────────────

describe('6. Compatible Units Allocation', () => {
  test('Hospital issues 1 unit of A+ and 1 unit of B+ to fulfill AB+ request; incompatible blood group is rejected with 400', async () => {
    // Hospital has 1 unit of A+ and 1 unit of B+, 0 units of AB+
    const hospitalA = await createVerifiedHospital('Cross River Hospital', {
      'AB+': 0,
      'A+': 1,
      'B+': 1,
    });

    const patientUser = await registerUser(app);
    const reqRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${patientUser.token}`)
      .send({
        patientName: 'Universal Recipient',
        bloodGroup: 'AB+',
        unitsNeeded: 2,
        urgency: 'high',
        targetHospital: hospitalA.hospital._id.toString(),
      });

    expect(reqRes.status).toBe(201);
    const requestId = reqRes.body.data._id;

    // Accept request (0 units of exact AB+ available)
    await request(app)
      .patch(`/api/requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${hospitalA.token}`);

    // Issue 1 compatible unit of A+
    const compRes1 = await request(app)
      .post(`/api/requests/${requestId}/issue-compatible`)
      .set('Authorization', `Bearer ${hospitalA.token}`)
      .send({ bloodGroup: 'A+', units: 1 });

    expect(compRes1.status).toBe(200);
    expect(compRes1.body.data.unitsFulfilled).toBe(1);

    // Issue 1 compatible unit of B+ -> satisfies total needed (2)
    const compRes2 = await request(app)
      .post(`/api/requests/${requestId}/issue-compatible`)
      .set('Authorization', `Bearer ${hospitalA.token}`)
      .send({ bloodGroup: 'B+', units: 1 });

    expect(compRes2.status).toBe(200);
    expect(compRes2.body.data.unitsFulfilled).toBe(2);
    expect(compRes2.body.data.status).toBe('fulfilled');

    // Both A+ and B+ inventories decremented to 0
    const hosp = await Hospital.findById(hospitalA.hospital._id);
    expect(hosp.inventory.find((i) => i.bloodGroup === 'A+').units).toBe(0);
    expect(hosp.inventory.find((i) => i.bloodGroup === 'B+').units).toBe(0);

    // Now test incompatible group rejection on an O- request
    const oNegReqRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${patientUser.token}`)
      .send({
        patientName: 'Universal Donor Patient',
        bloodGroup: 'O-',
        unitsNeeded: 1,
        urgency: 'high',
        targetHospital: hospitalA.hospital._id.toString(),
      });

    expect(oNegReqRes.status).toBe(201);
    const oNegReqId = oNegReqRes.body.data._id;

    const incompRes = await request(app)
      .post(`/api/requests/${oNegReqId}/issue-compatible`)
      .set('Authorization', `Bearer ${hospitalA.token}`)
      .send({ bloodGroup: 'A+', units: 1 });

    expect(incompRes.status).toBe(400);
    expect(incompRes.body.message).toMatch(/compatible/i);
  });
});

// ── Requirement 7: Confirm Donation, Inventory Update & Ledger ───────────────

describe('7. Confirm Donation & Inventory Ledger Isolation', () => {
  test('Hospital confirms donor pledge -> ONLY target hospital stock increases (+1), donor lastDonationDate updates, InventoryTransaction created, other hospital stock untouched', async () => {
    const hospitalA = await createVerifiedHospital('Hospital East', { 'A+': 0 });
    const hospitalB = await createVerifiedHospital('Hospital West', { 'A+': 0 });

    const patientUser = await registerUser(app);
    const donor = await createCandidateDonor('A+');

    // Create request targeted at Hospital A
    const reqRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${patientUser.token}`)
      .send({
        patientName: 'Emma Watson',
        bloodGroup: 'A+',
        unitsNeeded: 1,
        urgency: 'high',
        targetHospital: hospitalA.hospital._id.toString(),
      });

    expect(reqRes.status).toBe(201);
    const requestId = reqRes.body.data._id;

    // Hospital A accepts (opens shortfall to donors)
    await request(app)
      .patch(`/api/requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${hospitalA.token}`);

    // Donor pledges to the request
    const pledgeRes = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donor.token}`)
      .send({ requestId, unitsDonated: 1 });

    expect(pledgeRes.status).toBe(201);
    const donationId = pledgeRes.body.data._id;

    // Hospital A confirms donation
    const confirmRes = await request(app)
      .patch(`/api/donations/${donationId}/complete`)
      .set('Authorization', `Bearer ${hospitalA.token}`);

    expect(confirmRes.status).toBe(200);

    // Verify Hospital A stock increased to 1
    const updatedHospA = await Hospital.findById(hospitalA.hospital._id);
    expect(updatedHospA.inventory.find((i) => i.bloodGroup === 'A+').units).toBe(1);

    // Verify Hospital B stock remained completely untouched (0)
    const updatedHospB = await Hospital.findById(hospitalB.hospital._id);
    expect(updatedHospB.inventory.find((i) => i.bloodGroup === 'A+').units).toBe(0);

    // Verify Donor lastDonationDate was set
    const updatedDonorProfile = await DonorProfile.findOne({ user: donor.user._id || donor.user.id });
    expect(updatedDonorProfile.lastDonationDate).not.toBeNull();
    expect(updatedDonorProfile.totalDonations).toBe(1);

    // Verify InventoryTransaction log was created
    const tx = await InventoryTransaction.findOne({
      hospital: hospitalA.hospital._id,
      bloodGroup: 'A+',
      reason: 'donation_received',
    });
    expect(tx).not.toBeNull();
    expect(tx.change).toBe(1);
  });
});

// ── Requirement 8: Requester Excluded from Matching ──────────────────────────

describe('8. Requester Cannot Match Own Request', () => {
  test('Requester who is also registered as donor is excluded from candidate matches for their own request', async () => {
    const hospitalA = await createVerifiedHospital('Metro General', { 'O+': 0 });

    // User is registered as donor with O+
    const requesterDonor = await createCandidateDonor('O+');

    // Create another candidate donor with O+
    const otherDonor = await createCandidateDonor('O+');

    // Requester creates emergency blood request for O+
    const reqRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterDonor.token}`)
      .send({
        patientName: 'Family Member of Requester',
        bloodGroup: 'O+',
        unitsNeeded: 1,
        urgency: 'high',
        targetHospital: hospitalA.hospital._id.toString(),
      });

    expect(reqRes.status).toBe(201);
    const requestId = reqRes.body.data._id;

    // Hospital A accepts (broadcasting to donors)
    await request(app)
      .patch(`/api/requests/${requestId}/accept`)
      .set('Authorization', `Bearer ${hospitalA.token}`);

    // Call matching engine
    const matchRes = await request(app)
      .get(`/api/requests/${requestId}/matches`);

    expect(matchRes.status).toBe(200);
    const matches = matchRes.body.data.matches;

    // Check candidate user IDs
    const matchedUserIds = matches.map((m) =>
      (m.donor?.user?._id || m.donor?.user?.id || m.donor?.user).toString()
    );

    const requesterUserId = (requesterDonor.user._id || requesterDonor.user.id).toString();
    const otherUserId = (otherDonor.user._id || otherDonor.user.id).toString();

    // The other donor should match, but the requester must NOT match
    expect(matchedUserIds).toContain(otherUserId);
    expect(matchedUserIds).not.toContain(requesterUserId);
  });
});

// ── Requirement 9: Critical Request 15-Minute Timeout ────────────────────────

describe('9. Critical Request Timeout', () => {
  test('Critical request pending hospital review > 15 min becomes hospital_no_response when accessed', async () => {
    const hospitalA = await createVerifiedHospital('Emergency Trauma Center');
    const patientUser = await registerUser(app);

    const reqRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${patientUser.token}`)
      .send({
        patientName: 'Trauma Victim',
        bloodGroup: 'AB-',
        unitsNeeded: 2,
        urgency: 'critical',
        targetHospital: hospitalA.hospital._id.toString(),
      });

    expect(reqRes.status).toBe(201);
    const requestId = reqRes.body.data._id;
    expect(reqRes.body.data.status).toBe('pending_hospital_review');

    // Backdate createdAt directly in MongoDB collection by 16 minutes (beyond 15-minute SLA)
    const sixteenMinutesAgo = new Date(Date.now() - 16 * 60 * 1000);
    await BloodRequest.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(requestId) },
      { $set: { createdAt: sixteenMinutesAgo } }
    );

    // Fetch the request via API
    const viewRes = await request(app).get(`/api/requests/${requestId}`);
    expect(viewRes.status).toBe(200);
    expect(viewRes.body.data.status).toBe('hospital_no_response');
  });
});
