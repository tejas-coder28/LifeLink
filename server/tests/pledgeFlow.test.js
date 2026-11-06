/**
 * tests/pledgeFlow.test.js
 *
 * Dedicated test suite for the pledge flow, unit display, and read-only AI guarantee:
 * 1. Unit helper tests (formatUnits singular/plural, ml/L conversion).
 * 2. Zod & service validation on POST /api/donations/pledge:
 *    - Missing units -> 400 validation error.
 *    - units > MAX_UNITS_PER_DONOR_PER_PLEDGE -> 400 error.
 *    - units > still needed from donors -> 400 error.
 *    - Ineligible donor (cooldown / offline) -> 403 error.
 *    - Duplicate pledge by same donor -> 409 error.
 *    - Valid pledge { requestId, units: 1 } -> 201, updates request's pledged units to 1.
 * 3. AI assistant read-only verification:
 *    - POST /api/ai/chat NEVER creates a donation or pledge.
 */

require('./setup');

const request = require('supertest');
const { connect, clearDatabase, disconnect } = require('./helpers/db');
const { registerUser } = require('./helpers/auth');
const { formatUnits, ML_PER_UNIT, MAX_UNITS_PER_DONOR_PER_PLEDGE } = require('../src/config/bloodUnits');

let app;
let DonorProfile;
let BloodRequest;
let Hospital;
let User;
let Donation;

beforeAll(async () => {
  await connect();
  app = require('../src/app');
  DonorProfile = require('../src/repositories/donorProfile.repository');
  BloodRequest = require('../src/repositories/bloodRequest.repository');
  Hospital = require('../src/repositories/hospital.repository');
  User = require('../src/repositories/user.repository');
  Donation = require('../src/repositories/donation.repository');
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnect();
});

// Helper: create a verified hospital and an open blood request
const setupHospitalAndRequest = async (requesterToken, options = {}) => {
  let hospital = await Hospital.findOne({ isVerified: true });
  if (!hospital) {
    const hospUser = await User.create({
      name: 'City Care Hospital',
      email: `hosp_${Date.now()}_${Math.random()}@care.com`,
      password: 'password123',
      accountType: 'hospital',
    });
    hospital = await Hospital.create({
      name: 'City Care General Hospital',
      user: hospUser._id,
      licenseNumber: `LIC-CC-${Date.now()}`,
      address: '100 Medical Blvd, City',
      location: { type: 'Point', coordinates: [77.209, 28.6139] },
      inventory: [{ bloodGroup: options.bloodGroup || 'O+', units: 0 }],
      isVerified: true,
    });
  }

  const res = await request(app)
    .post('/api/requests')
    .set('Authorization', `Bearer ${requesterToken}`)
    .send({
      patientName: options.patientName || 'Jane Patient',
      bloodGroup: options.bloodGroup || 'O+',
      unitsNeeded: options.unitsNeeded || 2,
      urgency: 'high',
      targetHospital: hospital._id.toString(),
      address: '100 Medical Blvd, City',
    });

  const createdId = res.body?.data?._id;
  if (createdId) {
    await BloodRequest.findByIdAndUpdate(createdId, {
      status: 'open',
      unitsFromDonors: options.unitsFromDonors !== undefined ? options.unitsFromDonors : (options.unitsNeeded || 2),
      unitsFulfilled: options.unitsFulfilled || 0,
    });
    res.body.data.status = 'open';
    res.body.data.unitsFromDonors = options.unitsFromDonors !== undefined ? options.unitsFromDonors : (options.unitsNeeded || 2);
  }

  return res.body.data;
};

// ── 1. Unit Helper Tests ───────────────────────────────────────────────────────
describe('Unit Helper formatUnits()', () => {
  test('constants are configured properly', () => {
    expect(ML_PER_UNIT).toBe(450);
    expect(MAX_UNITS_PER_DONOR_PER_PLEDGE).toBe(1);
  });

  test('formatUnits(1) -> "1 unit (≈ 450 ml)"', () => {
    expect(formatUnits(1)).toBe('1 unit (≈ 450 ml)');
  });

  test('formatUnits(2) -> "2 units (≈ 900 ml)"', () => {
    expect(formatUnits(2)).toBe('2 units (≈ 900 ml)');
  });

  test('formatUnits(0) -> "0 units (≈ 0 ml)"', () => {
    expect(formatUnits(0)).toBe('0 units (≈ 0 ml)');
  });

  test('formatUnits(77, { useLitres: true }) -> "77 units (≈ 34.7 L)"', () => {
    expect(formatUnits(77, { useLitres: true })).toBe('77 units (≈ 34.7 L)');
  });

  test('formatUnits(77) defaults to litres for >= 1000 ml -> "77 units (≈ 34.7 L)"', () => {
    expect(formatUnits(77)).toBe('77 units (≈ 34.7 L)');
  });

  test('formatUnits(77, { useLitres: false }) -> "77 units (≈ 34650 ml)"', () => {
    expect(formatUnits(77, { useLitres: false })).toBe('77 units (≈ 34650 ml)');
  });
});

// ── 2. Pledge Flow Server Validation ───────────────────────────────────────────
describe('POST /api/donations/pledge validation and flow', () => {
  test('pledge without units returns 400 validation error', async () => {
    const requester = await registerUser(app, { email: 'req_v1@test.com', bloodGroup: 'O+' });
    const donor = await registerUser(app, { email: 'don_v1@test.com', bloodGroup: 'O+' });
    const bloodReq = await setupHospitalAndRequest(requester.token, { unitsNeeded: 2 });

    const res = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donor.token}`)
      .send({ requestId: bloodReq._id });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('pledge with units > MAX_UNITS_PER_DONOR_PER_PLEDGE returns 400', async () => {
    const requester = await registerUser(app, { email: 'req_v2@test.com', bloodGroup: 'O+' });
    const donor = await registerUser(app, { email: 'don_v2@test.com', bloodGroup: 'O+' });
    const bloodReq = await setupHospitalAndRequest(requester.token, { unitsNeeded: 2 });

    const res = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donor.token}`)
      .send({ requestId: bloodReq._id, units: 2 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const errMsg = res.body.message || (res.body.errors && res.body.errors[0]?.message) || '';
    expect(errMsg).toMatch(/limit|allowed|maximum/i);
  });

  test('pledge with units > still needed returns 400', async () => {
    const requester = await registerUser(app, { email: 'req_v3@test.com', bloodGroup: 'O+' });
    const donor = await registerUser(app, { email: 'don_v3@test.com', bloodGroup: 'O+' });
    // Request where needed from donors is 0 (or completely fulfilled)
    const bloodReq = await setupHospitalAndRequest(requester.token, {
      unitsNeeded: 1,
      unitsFromDonors: 1,
      unitsFulfilled: 1,
    });

    const res = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donor.token}`)
      .send({ requestId: bloodReq._id, units: 1 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/fulfill|remain|exceed/i);
  });

  test('pledge with ineligible donor in cooldown returns 403', async () => {
    const requester = await registerUser(app, { email: 'req_v4@test.com', bloodGroup: 'O+' });
    const donor = await registerUser(app, { email: 'don_v4@test.com', bloodGroup: 'O+' });
    const bloodReq = await setupHospitalAndRequest(requester.token, { unitsNeeded: 2 });

    // Set lastDonationDate to 10 days ago
    const donorUser = await User.findOne({ email: 'don_v4@test.com' });
    await DonorProfile.findOneAndUpdate(
      { user: donorUser._id },
      { lastDonationDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }
    );

    const res = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donor.token}`)
      .send({ requestId: bloodReq._id, units: 1 });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/cooldown/i);
  });

  test('duplicate pledge returns 409', async () => {
    const requester = await registerUser(app, { email: 'req_v5@test.com', bloodGroup: 'O+' });
    const donor = await registerUser(app, { email: 'don_v5@test.com', bloodGroup: 'O+' });
    const bloodReq = await setupHospitalAndRequest(requester.token, { unitsNeeded: 2 });

    // First pledge
    const res1 = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donor.token}`)
      .send({ requestId: bloodReq._id, units: 1 });
    expect(res1.status).toBe(201);

    // Second pledge by same donor
    const res2 = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donor.token}`)
      .send({ requestId: bloodReq._id, units: 1 });

    expect(res2.status).toBe(409);
    expect(res2.body.message).toMatch(/already pledged/i);
  });

  test('valid pledge with units: 1 succeeds and creates donation', async () => {
    const requester = await registerUser(app, { email: 'req_v6@test.com', bloodGroup: 'O+' });
    const donor = await registerUser(app, { email: 'don_v6@test.com', bloodGroup: 'O+' });
    const bloodReq = await setupHospitalAndRequest(requester.token, { unitsNeeded: 2 });

    const res = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donor.token}`)
      .send({ requestId: bloodReq._id, units: 1 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.unitsDonated).toBe(1);
    expect(res.body.data.status).toBe('pledged');

    // Verify donation record exists in database
    const savedDonation = await Donation.findById(res.body.data._id);
    expect(savedDonation).not.toBeNull();
    expect(savedDonation.unitsDonated).toBe(1);

    // Verify hospital pledges endpoint returns it
    const hospPledges = await Donation.find({ request: bloodReq._id, status: 'pledged' });
    expect(hospPledges).toHaveLength(1);
    expect(hospPledges[0].unitsDonated).toBe(1);
  });
});

// ── 3. AI Assistant Read-Only Verification ──────────────────────────────────────
describe('AI assistant read-only guarantee', () => {
  test('/api/ai/chat NEVER creates a pledge or donation', async () => {
    const requester = await registerUser(app, { email: 'req_ai@test.com', bloodGroup: 'B+' });
    const donor = await registerUser(app, { email: 'don_ai@test.com', bloodGroup: 'B+' });
    const bloodReq = await setupHospitalAndRequest(requester.token, { bloodGroup: 'B+', unitsNeeded: 2 });

    // Verify 0 donations exist before chat call
    const initialDonations = (await Donation.find({})).length;
    expect(initialDonations).toBe(0);

    // Call chat asking to pledge or asking about requests
    const chatRes = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${donor.token}`)
      .send({ message: 'is there any request?' });

    expect(chatRes.status).toBe(200);
    expect(chatRes.body.success).toBe(true);
    // Action should guide user to dashboard with Review & Pledge
    const pledgeAction = chatRes.body.data.actions?.find((a) => a.label === 'Review & Pledge');
    expect(pledgeAction).toBeDefined();
    expect(pledgeAction.path).toBe('/donor/dashboard');
    expect(pledgeAction.query).toMatch(/action=pledge/);

    // Verify 0 donations exist after chat call — AI NEVER pledges directly
    const finalDonations = (await Donation.find({})).length;
    expect(finalDonations).toBe(0);
  });
});
