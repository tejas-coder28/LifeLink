/**
 * tests/requestFulfillmentRules.test.js
 *
 * Automated integration tests for Blood Request Fulfillment rules:
 * 1. Fulfilled request returns 409 on matches and contact endpoints.
 * 2. Partially fulfilled request still allows matches and contact.
 * 3. Fulfilled requests are hidden from donor lists.
 * 4. Pending pings are cancelled when a request becomes fulfilled, and donors are notified.
 */

require('./setup');

const request = require('supertest');
const { connect, clearDatabase, disconnect } = require('./helpers/db');
const { registerUser, registerHospital } = require('./helpers/auth');

let app;
let DonorProfile;
let BloodRequest;
let Hospital;
let User;
let DonorRequestPing;
let Notification;

beforeAll(async () => {
  await connect();
  app = require('../src/app');
  DonorProfile = require('../src/repositories/donorProfile.repository');
  BloodRequest = require('../src/repositories/bloodRequest.repository');
  Hospital = require('../src/repositories/hospital.repository');
  User = require('../src/repositories/user.repository');
  DonorRequestPing = require('../src/repositories/donorRequestPing.repository');
  Notification = require('../src/repositories/notification.repository');
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnect();
});

// Helper: create a verified hospital
const createHospital = async (name = 'City Care Hospital') => {
  const { user, token } = await registerHospital(app, {
    name,
    email: `hosp_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`,
  });

  const hospitalDoc = await Hospital.findOne({ user: user._id });
  hospitalDoc.isVerified = true;
  await hospitalDoc.save();

  return { hospitalDoc, hospUser: user, hospToken: token };
};

describe('Request Fulfillment & Donor Seeking Rules', () => {
  test('1. Fulfilled request returns 409 on matches and contact endpoints', async () => {
    const { hospitalDoc, hospUser, hospToken } = await createHospital('Metropolitan Hospital');

    // Register a donor
    const donorRes = await registerUser(app, {
      name: 'Eligible Donor A',
      email: `donor_a_${Date.now()}@test.com`,
      bloodGroup: 'B+',
    });
    const donorUser = donorRes.user;

    // Create a fulfilled blood request
    const bloodRequest = await BloodRequest.create({
      requester: hospUser._id,
      targetHospital: hospitalDoc._id,
      patientName: 'Jane Doe',
      bloodGroup: 'B+',
      unitsNeeded: 2,
      unitsFromStock: 2,
      unitsFromDonors: 0,
      unitsFulfilled: 2,
      urgency: 'high',
      status: 'fulfilled',
      address: '123 Medical Way',
      location: { type: 'Point', coordinates: [77.209, 28.6139] },
    });

    // 1a. GET /api/requests/:id/matches must return 409
    const matchRes = await request(app)
      .get(`/api/requests/${bloodRequest._id}/matches`)
      .set('Authorization', `Bearer ${hospToken}`);

    expect(matchRes.status).toBe(409);
    expect(matchRes.body.success).toBe(false);
    expect(matchRes.body.message).toMatch(/already fulfilled/i);

    // 1b. POST /api/requests/:id/notify/:donorId must return 409
    const pingRes = await request(app)
      .post(`/api/requests/${bloodRequest._id}/notify/${donorUser._id}`)
      .set('Authorization', `Bearer ${hospToken}`);

    expect(pingRes.status).toBe(409);
    expect(pingRes.body.success).toBe(false);
    expect(pingRes.body.message).toMatch(/already fulfilled/i);
  });

  test('2. Partially fulfilled request still allows matches and contact', async () => {
    const { hospitalDoc, hospUser, hospToken } = await createHospital('Central Hospital');

    // Register a donor with matching blood group B+
    const donorRes = await registerUser(app, {
      name: 'Eligible Donor B',
      email: `donor_b_${Date.now()}@test.com`,
      bloodGroup: 'B+',
    });
    const donorUser = donorRes.user;

    // Create a partially fulfilled blood request (needed: 3, stock: 1, donors needed: 2, received: 1)
    const bloodRequest = await BloodRequest.create({
      requester: hospUser._id,
      targetHospital: hospitalDoc._id,
      patientName: 'John Doe',
      bloodGroup: 'B+',
      unitsNeeded: 3,
      unitsFromStock: 1,
      unitsFromDonors: 2,
      unitsFulfilled: 1,
      urgency: 'critical',
      status: 'partially_fulfilled',
      address: '77 Health Blvd',
      location: { type: 'Point', coordinates: [77.209, 28.6139] },
    });

    // 2a. GET /api/requests/:id/matches must succeed (200)
    const matchRes = await request(app)
      .get(`/api/requests/${bloodRequest._id}/matches`)
      .set('Authorization', `Bearer ${hospToken}`);

    expect(matchRes.status).toBe(200);
    expect(matchRes.body.success).toBe(true);
    expect(matchRes.body.data.matchesCount).toBeGreaterThanOrEqual(1);

    // 2b. POST /api/requests/:id/notify/:donorId must succeed (201)
    const pingRes = await request(app)
      .post(`/api/requests/${bloodRequest._id}/notify/${donorUser._id}`)
      .set('Authorization', `Bearer ${hospToken}`);

    expect(pingRes.status).toBe(201);
    expect(pingRes.body.success).toBe(true);
    expect(pingRes.body.data.status).toBe('pending');
  });

  test('3. Fulfilled requests are hidden from donor lists', async () => {
    const { hospitalDoc, hospUser } = await createHospital('Westside Clinic');

    // Register donor
    const donorRes = await registerUser(app, {
      name: 'Browsing Donor',
      email: `donor_browse_${Date.now()}@test.com`,
      bloodGroup: 'O+',
    });
    const donorToken = donorRes.token;

    // Request 1: Open / accepted (units needed from donors = 2)
    const openReq = await BloodRequest.create({
      requester: hospUser._id,
      targetHospital: hospitalDoc._id,
      patientName: 'Open Patient',
      bloodGroup: 'O+',
      unitsNeeded: 2,
      unitsFromStock: 0,
      unitsFromDonors: 2,
      unitsFulfilled: 0,
      urgency: 'high',
      status: 'open',
      address: 'West Clinic Road',
      location: { type: 'Point', coordinates: [77.209, 28.6139] },
    });

    // Request 2: Fulfilled (units fulfilled = 2)
    const fulfilledReq = await BloodRequest.create({
      requester: hospUser._id,
      targetHospital: hospitalDoc._id,
      patientName: 'Fulfilled Patient',
      bloodGroup: 'O+',
      unitsNeeded: 2,
      unitsFromStock: 2,
      unitsFromDonors: 0,
      unitsFulfilled: 2,
      urgency: 'high',
      status: 'fulfilled',
      address: 'West Clinic Road',
      location: { type: 'Point', coordinates: [77.209, 28.6139] },
    });

    // Donor queries GET /api/requests
    const listRes = await request(app)
      .get('/api/requests')
      .set('Authorization', `Bearer ${donorToken}`);

    expect(listRes.status).toBe(200);
    const returnedIds = (listRes.body.data || []).map((r) => r._id.toString());

    // Open request must be visible
    expect(returnedIds).toContain(openReq._id.toString());
    // Fulfilled request must NOT be visible
    expect(returnedIds).not.toContain(fulfilledReq._id.toString());
  });

  test('4. Pending pings are cancelled when a request becomes fulfilled and donors are notified', async () => {
    const { hospitalDoc, hospUser, hospToken } = await createHospital('North General');

    // Register a candidate donor
    const donorRes = await registerUser(app, {
      name: 'Pinged Donor',
      email: `donor_pinged_${Date.now()}@test.com`,
      bloodGroup: 'A+',
    });
    const donorUser = donorRes.user;

    // Create an open request
    const bloodRequest = await BloodRequest.create({
      requester: hospUser._id,
      targetHospital: hospitalDoc._id,
      patientName: 'Emergency Patient',
      bloodGroup: 'A+',
      unitsNeeded: 1,
      unitsFromStock: 0,
      unitsFromDonors: 1,
      unitsFulfilled: 0,
      urgency: 'critical',
      status: 'open',
      address: 'North General Road',
      location: { type: 'Point', coordinates: [77.209, 28.6139] },
    });

    // Hospital pings the donor
    const pingRes = await request(app)
      .post(`/api/requests/${bloodRequest._id}/notify/${donorUser._id}`)
      .set('Authorization', `Bearer ${hospToken}`);

    expect(pingRes.status).toBe(201);
    const pingId = pingRes.body.data._id;

    // Verify initial ping status is 'pending'
    const initialPing = await DonorRequestPing.findById(pingId);
    expect(initialPing.status).toBe('pending');

    // Now request status is updated to 'fulfilled'
    const updateRes = await request(app)
      .patch(`/api/requests/${bloodRequest._id}/status`)
      .set('Authorization', `Bearer ${hospToken}`)
      .send({ status: 'fulfilled' });

    expect(updateRes.status).toBe(200);

    // Verify ping status is now 'cancelled'
    const updatedPing = await DonorRequestPing.findById(pingId);
    expect(updatedPing.status).toBe('cancelled');

    // Verify notification was sent to donor with "Request fulfilled, thank you"
    const notif = await Notification.findOne({
      recipient: donorUser._id,
      title: 'Request fulfilled, thank you',
    });
    expect(notif).not.toBeNull();
    expect(notif.message).toMatch(/Request fulfilled, thank you/i);
  });
});
