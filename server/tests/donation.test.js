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
const mongoose = require('mongoose');
const { connect, clearDatabase, disconnect } = require('./helpers/db');
const { registerUser } = require('./helpers/auth');

let app;
let DonorProfile;
let BloodRequest;
let User;

beforeAll(async () => {
  await connect();
  app = require('../src/app');
  DonorProfile = require('../src/models/DonorProfile');
  BloodRequest = require('../src/models/BloodRequest');
  User = require('../src/models/User');
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnect();
});

// ── Helper: create a blood request for a given user ──────────────────────────

const createBloodRequest = async (requesterToken, bloodGroup = 'A+') => {
  const res = await request(app)
    .post('/api/requests')
    .set('Authorization', `Bearer ${requesterToken}`)
    .send({
      patientName: 'Patient Zero',
      bloodGroup,
      unitsNeeded: 1,
      urgency: 'critical',
      address: '42 Hospital Road, Test City',
    });
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
  test('lastDonationDate is set on donor profile after completion', async () => {
    const requesterRes = await registerUser(app, {
      email: 'req3@test.com',
      bloodGroup: 'A-',
    });
    const donorRes = await registerUser(app, {
      email: 'don3@test.com',
      bloodGroup: 'A-',
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

    // Verify lastDonationDate is null before completion
    const donorUser = await User.findOne({ email: 'don3@test.com' });
    const profileBefore = await DonorProfile.findOne({ user: donorUser._id });
    expect(profileBefore.lastDonationDate).toBeNull();

    // Complete
    const completeRes = await request(app)
      .patch(`/api/donations/${donationId}/complete`)
      .set('Authorization', `Bearer ${donorRes.token}`);
    expect(completeRes.status).toBe(200);

    // Verify lastDonationDate is now set
    const profileAfter = await DonorProfile.findOne({ user: donorUser._id });
    expect(profileAfter.lastDonationDate).not.toBeNull();
    expect(profileAfter.totalDonations).toBe(1);
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
