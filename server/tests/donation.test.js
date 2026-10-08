/**
 * tests/donation.test.js
 *
 * Pledge / donation suite (integration tests via HTTP):
 *   - Incompatible blood group pledge returns 403
 *   - Duplicate pledge on same request is rejected (400)
 *   - Completing a donation updates lastDonationDate on DonorProfile
 *   - Donor inside 90-day cooldown cannot pledge (403)
 */

require('./setup');

const request = require('supertest');
const { connect, clearDatabase, disconnect } = require('./helpers/db');
const { registerUser, registerAdmin } = require('./helpers/auth');

let app;
let DonorProfile;
let BloodRequest;
let Hospital;
let User;

beforeAll(async () => {
  await connect();
  app = require('../src/app');
  DonorProfile = require('../src/repositories/donorProfile.repository');
  BloodRequest = require('../src/repositories/bloodRequest.repository');
  Hospital = require('../src/repositories/hospital.repository');
  User = require('../src/repositories/user.repository');
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnect();
});

// ── Helper: create a blood request for a given user ──────────────────────────

const createBloodRequest = async (requesterToken, bloodGroup = 'A+') => {
  let hospital = await Hospital.findOne({ isVerified: true });
  if (!hospital) {
    const hospUser = await User.create({
      name: 'Test Hospital',
      email: `test_hosp_${Date.now()}_${Math.random()}@test.com`,
      password: 'password123',
      accountType: 'hospital',
    });
    hospital = await Hospital.create({
      name: 'Test General Hospital',
      user: hospUser._id,
      licenseNumber: `LIC-${Date.now()}`,
      address: '42 Hospital Road, Test City',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
      inventory: [{ bloodGroup: 'O+', units: 0 }],
      isVerified: true,
    });
  }

  const res = await request(app)
    .post('/api/requests')
    .set('Authorization', `Bearer ${requesterToken}`)
    .send({
      patientName: 'Patient Zero',
      bloodGroup,
      unitsNeeded: 1,
      urgency: 'critical',
      targetHospital: hospital._id.toString(),
      address: '42 Hospital Road, Test City',
    });

  if (res.body?.data?._id) {
    await BloodRequest.findByIdAndUpdate(res.body.data._id, {
      status: 'open',
      unitsFromDonors: 1,
    });
    res.body.data.status = 'open';
    res.body.data.unitsFromDonors = 1;
  }

  return res;
};

// ─── Incompatible pledge ──────────────────────────────────────────────────────

describe('Incompatible blood group pledge', () => {
  test('returns 403 when donor blood group cannot donate to request blood group', async () => {
    // B+ donor, A+ request — B+ cannot donate to A+
    const requesterRes = await registerUser(app, {
      email: 'requester@test.com',
      bloodGroup: 'A+',
    });
    const donorRes = await registerUser(app, {
      email: 'donor@test.com',
      bloodGroup: 'B+',
    });

    const requestRes = await createBloodRequest(requesterRes.token, 'A+');
    expect(requestRes.status).toBe(201);
    const requestId = requestRes.body.data._id;

    const pledgeRes = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donorRes.token}`)
      .send({ requestId, unitsDonated: 1 });

    expect(pledgeRes.status).toBe(403);
    expect(pledgeRes.body.success).toBe(false);
    expect(pledgeRes.body.message).toMatch(/incompatible/i);
  });
});

// ─── Duplicate pledge ─────────────────────────────────────────────────────────

describe('Duplicate pledge rejection', () => {
  test('returns 400 when same donor pledges twice to the same request', async () => {
    const requesterRes = await registerUser(app, {
      email: 'req2@test.com',
      bloodGroup: 'O+',
    });
    const donorRes = await registerUser(app, {
      email: 'don2@test.com',
      bloodGroup: 'O+',
    });

    const requestRes = await createBloodRequest(requesterRes.token, 'O+');
    expect(requestRes.status).toBe(201);
    const requestId = requestRes.body.data._id;

    // First pledge — should succeed
    const firstPledge = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donorRes.token}`)
      .send({ requestId, unitsDonated: 1 });
    expect(firstPledge.status).toBe(201);

    // Second pledge — should fail
    const secondPledge = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donorRes.token}`)
      .send({ requestId, unitsDonated: 1 });
    expect(secondPledge.status).toBe(400);
    expect(secondPledge.body.message).toMatch(/already pledged/i);
  });
});

// ─── Complete donation updates lastDonationDate ───────────────────────────────

describe('Completing a donation updates lastDonationDate', () => {
  test('lastDonationDate is set on donor profile after completion by authorized admin/hospital', async () => {
    const requesterRes = await registerUser(app, {
      email: 'req3@test.com',
      bloodGroup: 'A-',
    });
    const donorRes = await registerUser(app, {
      email: 'don3@test.com',
      bloodGroup: 'A-',
    });
    const adminRes = await registerAdmin(app, {
      email: 'admin_confirm@test.com',
    });

    const requestRes = await createBloodRequest(requesterRes.token, 'A-');
    expect(requestRes.status).toBe(201);
    const requestId = requestRes.body.data._id;

    // Pledge
    const pledgeRes = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donorRes.token}`)
      .send({ requestId, unitsDonated: 1 });
    expect(pledgeRes.status).toBe(201);
    const donationId = pledgeRes.body.data._id;

    // Verify regular user gets 403 on complete
    const forbiddenRes = await request(app)
      .patch(`/api/donations/${donationId}/complete`)
      .set('Authorization', `Bearer ${donorRes.token}`);
    expect(forbiddenRes.status).toBe(403);

    // Verify lastDonationDate is null before completion
    const donorUser = await User.findOne({ email: 'don3@test.com' });
    const profileBefore = await DonorProfile.findOne({ user: donorUser._id });
    expect(profileBefore.lastDonationDate).toBeNull();

    // Complete using admin token
    const completeRes = await request(app)
      .patch(`/api/donations/${donationId}/complete`)
      .set('Authorization', `Bearer ${adminRes.token}`);
    expect(completeRes.status).toBe(200);

    // Verify lastDonationDate is now set
    const profileAfter = await DonorProfile.findOne({ user: donorUser._id });
    expect(profileAfter.lastDonationDate).not.toBeNull();
    expect(profileAfter.totalDonations).toBe(1);

    // Verify confirming an already completed donation returns 400
    const alreadyCompleted = await request(app)
      .patch(`/api/donations/${donationId}/complete`)
      .set('Authorization', `Bearer ${adminRes.token}`);
    expect(alreadyCompleted.status).toBe(400);
  });

  test('declining a pledge sets status Cancelled and does NOT modify lastDonationDate', async () => {
    const requesterRes = await registerUser(app, {
      email: 'req_dec@test.com',
      bloodGroup: 'O-',
    });
    const donorRes = await registerUser(app, {
      email: 'don_dec@test.com',
      bloodGroup: 'O-',
    });
    const adminRes = await registerAdmin(app, {
      email: 'admin_dec@test.com',
    });

    const requestRes = await createBloodRequest(requesterRes.token, 'O-');
    const requestId = requestRes.body.data._id;

    const pledgeRes = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donorRes.token}`)
      .send({ requestId, unitsDonated: 1 });
    const donationId = pledgeRes.body.data._id;

    // Decline via admin
    const declineRes = await request(app)
      .patch(`/api/donations/${donationId}/decline`)
      .set('Authorization', `Bearer ${adminRes.token}`);
    expect(declineRes.status).toBe(200);
    expect(declineRes.body.data.status).toBe('cancelled');

    // Verify donor lastDonationDate remains null
    const donorUser = await User.findOne({ email: 'don_dec@test.com' });
    const profile = await DonorProfile.findOne({ user: donorUser._id });
    expect(profile.lastDonationDate).toBeNull();
    expect(profile.totalDonations).toBe(0);
  });
});

// ─── 90-day cooldown blocks pledge ───────────────────────────────────────────

describe('90-day cooldown window blocks pledge', () => {
  test('returns 403 when donor donated within 90 days', async () => {
    const requesterRes = await registerUser(app, {
      email: 'req4@test.com',
      bloodGroup: 'B-',
    });
    const donorRes = await registerUser(app, {
      email: 'don4@test.com',
      bloodGroup: 'B-',
    });

    // Manually set lastDonationDate to 30 days ago (within cooldown window)
    const donorUser = await User.findOne({ email: 'don4@test.com' });
    const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await DonorProfile.findOneAndUpdate(
      { user: donorUser._id },
      { lastDonationDate: recentDate }
    );

    const requestRes = await createBloodRequest(requesterRes.token, 'B-');
    expect(requestRes.status).toBe(201);
    const requestId = requestRes.body.data._id;

    const pledgeRes = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donorRes.token}`)
      .send({ requestId, unitsDonated: 1 });

    expect(pledgeRes.status).toBe(403);
    expect(pledgeRes.body.message).toMatch(/cooldown/i);
  });
});

// ─── Hospital Pledges Retrieval ───────────────────────────────────────────────

describe('Hospital pledges endpoint GET /api/donations/hospital', () => {
  test('regular user calling GET /api/donations/hospital gets 403', async () => {
    const userRes = await registerUser(app, { email: 'reg_pledges@test.com' });
    const res = await request(app)
      .get('/api/donations/hospital')
      .set('Authorization', `Bearer ${userRes.token}`);
    expect(res.status).toBe(403);
  });

  test('admin or hospital can retrieve pledges with donor and request details', async () => {
    const adminRes = await registerAdmin(app, { email: 'admin_plg@test.com' });
    const donorRes = await registerUser(app, {
      email: 'donor_plg@test.com',
      bloodGroup: 'AB+',
    });

    const requestRes = await createBloodRequest(adminRes.token, 'AB+');
    const requestId = requestRes.body.data._id;

    await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donorRes.token}`)
      .send({ requestId, unitsDonated: 1 });

    const getRes = await request(app)
      .get('/api/donations/hospital')
      .set('Authorization', `Bearer ${adminRes.token}`);

    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body.data)).toBe(true);
    expect(getRes.body.data.length).toBeGreaterThanOrEqual(1);

    const pledge = getRes.body.data[0];
    expect(pledge.donor).toBeDefined();
    expect(pledge.donor.name).toBeDefined();
    expect(pledge.request).toBeDefined();
    expect(pledge.status).toBe('pledged');
  });
});
