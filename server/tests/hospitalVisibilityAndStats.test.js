/**
 * tests/hospitalVisibilityAndStats.test.js
 *
 * Backend integration tests for:
 * 1. Request for Hospital A is returned for Hospital A in every status, and NEVER for Hospital B.
 * 2. Request without targetHospital is rejected (400).
 * 3. Hospital B cannot access Hospital A's request directly via GET /api/requests/:id (403).
 * 4. Total donations count only completed donations, NOT pending pledges.
 */

require('./setup');

const request = require('supertest');
const { connect, clearDatabase, disconnect } = require('./helpers/db');
const { registerUser, registerHospital } = require('./helpers/auth');

let app;
let BloodRequest;
let Hospital;
let User;
let Donation;
let DonorProfile;

beforeAll(async () => {
  await connect();
  app = require('../src/app');
  BloodRequest = require('../src/models/BloodRequest');
  Hospital = require('../src/models/Hospital');
  User = require('../src/models/User');
  Donation = require('../src/models/Donation');
  DonorProfile = require('../src/models/DonorProfile');
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnect();
});

const createVerifiedHospital = async (name, email) => {
  const reg = await registerHospital(app, { name, email });
  const userId = reg.user?._id || reg.user?.id || reg.user?.user?._id || reg.user?.user?.id;
  const hospital = await Hospital.findOne({ user: userId });
  hospital.isVerified = true;
  await hospital.save();
  return { token: reg.token, hospital, userId };
};

describe('Hospital Request Visibility & Access Isolation', () => {
  test('request without targetHospital is rejected with 400', async () => {
    const userRes = await registerUser(app, { email: 'user@test.com' });

    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${userRes.token}`)
      .send({
        patientName: 'Orphan Request',
        bloodGroup: 'O+',
        unitsNeeded: 2,
        urgency: 'high',
        address: '123 Main St',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/target hospital/i);
  });

  test('request for Hospital A is returned for A in every status and NEVER for Hospital B', async () => {
    // 1. Create verified Hospital A
    const hospA = await createVerifiedHospital('Hospital Alpha', 'hospA@test.com');
    const hospADoc = hospA.hospital;

    // 2. Create verified Hospital B
    const hospB = await createVerifiedHospital('Hospital Beta', 'hospB@test.com');
    const hospBDoc = hospB.hospital;

    // 3. Create regular user requester
    const userRes = await registerUser(app, { email: 'requester@test.com' });

    // 4. Create requests targeted at Hospital A in all possible statuses
    const statuses = [
      'pending_hospital_review',
      'open',
      'matching',
      'partially_fulfilled',
      'fulfilled',
      'rejected',
      'hospital_no_response',
    ];

    for (let i = 0; i < statuses.length; i++) {
      const status = statuses[i];
      await BloodRequest.create({
        requester: userRes.user._id,
        targetHospital: hospADoc._id,
        hospital: hospADoc._id,
        patientName: `Patient for A - ${status}`,
        bloodGroup: 'B+',
        unitsNeeded: 3,
        unitsFromStock: status === 'partially_fulfilled' ? 1 : 0,
        unitsFromDonors: status === 'partially_fulfilled' ? 2 : 3,
        unitsFulfilled: status === 'fulfilled' ? 3 : 0,
        urgency: 'high',
        address: 'Hospital A Grounds',
        status,
      });
    }

    // Also create 1 request for Hospital B
    const hospBReq = await BloodRequest.create({
      requester: userRes.user._id,
      targetHospital: hospBDoc._id,
      hospital: hospBDoc._id,
      patientName: 'Patient for B',
      bloodGroup: 'A+',
      unitsNeeded: 2,
      urgency: 'critical',
      address: 'Hospital B Grounds',
      status: 'open',
    });

    // 5. Query Hospital A's requests via GET /api/requests/me
    const resA = await request(app)
      .get('/api/requests/me')
      .set('Authorization', `Bearer ${hospA.token}`);

    expect(resA.status).toBe(200);
    expect(resA.body.success).toBe(true);
    const returnedA = resA.body.data;

    // Must return all 7 statuses for Hospital A
    expect(returnedA.length).toBe(7);
    const returnedStatuses = returnedA.map((r) => r.status);
    statuses.forEach((s) => {
      expect(returnedStatuses).toContain(s);
    });

    // None of Hospital A's returned requests should have targetHospital != Hospital A
    returnedA.forEach((r) => {
      const tHospId = r.targetHospital?._id || r.targetHospital;
      expect(tHospId.toString()).toBe(hospADoc._id.toString());
    });

    // 6. Query Hospital B's requests via GET /api/requests/me
    const resB = await request(app)
      .get('/api/requests/me')
      .set('Authorization', `Bearer ${hospB.token}`);

    expect(resB.status).toBe(200);
    expect(resB.body.success).toBe(true);
    const returnedB = resB.body.data;

    // Hospital B must ONLY see its 1 request and NEVER any of Hospital A's 7 requests
    expect(returnedB.length).toBe(1);
    expect(returnedB[0]._id.toString()).toBe(hospBReq._id.toString());
    expect(returnedB[0].patientName).toBe('Patient for B');

    // 7. Security: Hospital B cannot access Hospital A's request directly
    const firstARequest = returnedA[0];
    const directAccessRes = await request(app)
      .get(`/api/requests/${firstARequest._id}`)
      .set('Authorization', `Bearer ${hospB.token}`);

    expect(directAccessRes.status).toBe(403);
    expect(directAccessRes.body.message).toMatch(/another hospital/i);
  });
});

describe('Completed-Only Counting for Total Donations', () => {
  test('pledges do NOT increment totalDonations or lastDonationDate; only completed donations do', async () => {
    // 1. Setup hospital, donor, and requester
    const hosp = await createVerifiedHospital('Memorial City Hospital', 'memorial@test.com');
    const hospDoc = hosp.hospital;
    hospDoc.inventory = [{ bloodGroup: 'O+', units: 5 }];
    await hospDoc.save();

    const requesterRes = await registerUser(app, { email: 'req_pat@test.com' });
    const donorRes = await registerUser(app, {
      email: 'donor_hero@test.com',
      bloodGroup: 'O+',
    });

    // Initial donor profile check
    let donorProfile = await DonorProfile.findOne({ user: donorRes.user._id });
    expect(donorProfile.totalDonations).toBe(0);
    expect(donorProfile.lastDonationDate).toBeNull();

    // 2. Create blood request targeted to hospital
    const reqDoc = await BloodRequest.create({
      requester: requesterRes.user._id,
      targetHospital: hospDoc._id,
      hospital: hospDoc._id,
      patientName: 'Sanjay Kumar',
      bloodGroup: 'O+',
      unitsNeeded: 2,
      unitsFromStock: 0,
      unitsFromDonors: 2,
      unitsFulfilled: 0,
      urgency: 'high',
      address: 'City Center',
      status: 'open',
    });

    // 3. Donor pledges to request
    const pledgeRes = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donorRes.token}`)
      .send({
        requestId: reqDoc._id.toString(),
        unitsDonated: 1,
      });

    expect(pledgeRes.status).toBe(201);
    const donationId = pledgeRes.body.data._id;

    // Check donor profile after pledge: MUST STILL BE 0 and NULL!
    donorProfile = await DonorProfile.findOne({ user: donorRes.user._id });
    expect(donorProfile.totalDonations).toBe(0);
    expect(donorProfile.lastDonationDate).toBeNull();

    // 4. Hospital confirms donation -> status becomes 'completed'
    const confirmRes = await request(app)
      .patch(`/api/donations/${donationId}/complete`)
      .set('Authorization', `Bearer ${hosp.token}`);

    expect(confirmRes.status).toBe(200);

    // Now totalDonations MUST be 1 and lastDonationDate MUST be set
    donorProfile = await DonorProfile.findOne({ user: donorRes.user._id });
    expect(donorProfile.totalDonations).toBe(1);
    expect(donorProfile.lastDonationDate).not.toBeNull();
  });
});
