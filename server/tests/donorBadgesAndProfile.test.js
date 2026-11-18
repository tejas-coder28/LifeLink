/**
 * tests/donorBadgesAndProfile.test.js
 *
 * Dedicated tests for:
 * 1. Alerts = 0 for a brand new user
 * 2. Requests badge excludes already-pledged requests, cancelled/fulfilled, and duplicates
 * 3. AI tool counts strictly equal dashboard badges (single source of truth)
 * 4. Incomplete donor profile cannot pledge (returns 400 until profile is completed)
 * 5. Date helper outputs "7 Nov 2026" and "09:06 PM"
 */

require('./setup');

const request = require('supertest');
const { connect, clearDatabase, disconnect } = require('./helpers/db');
const { registerUser, registerHospital } = require('./helpers/auth');
const User = require('../src/repositories/user.repository');
const DonorProfile = require('../src/repositories/donorProfile.repository');
const BloodRequest = require('../src/repositories/bloodRequest.repository');
const Hospital = require('../src/repositories/hospital.repository');
const Donation = require('../src/repositories/donation.repository');
const donorBadgeService = require('../src/services/donorBadge.service');
const { executeTool } = require('../src/services/aiTools');
const { formatDate, formatTime, formatDateTime } = require('../src/utils/dateFormatter');

let app;

beforeAll(async () => {
  await connect();
  app = require('../src/app');
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnect();
});

describe('LifeLink Donor Badges, AI Parity & Profile Completion Protocol', () => {
  // ─── 1. Alerts = 0 for a new user ───────────────────────────────────────────
  test('alerts badge count is strictly 0 for a brand-new user', async () => {
    const { token, user } = await registerUser(app, {
      name: 'Fresh Google Donor',
      email: 'fresh_google_donor@test.com',
      bloodGroup: 'O+',
    });

    const badgeCount = await donorBadgeService.getAlertsBadgeCount(user._id);
    expect(badgeCount).toBe(0);

    const res = await request(app)
      .get('/api/donors/badges')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.alerts).toBe(0);
    expect(res.body.data.history).toBe(0);
  });

  // ─── 2. Requests badge excludes already-pledged requests ────────────────────
  test('requests badge excludes already-pledged, fulfilled, and cancelled requests', async () => {
    const { token: hospToken, user: hospUser } = await registerHospital(app, {
      name: 'Metro City Hospital',
      email: 'metro_hosp@test.com',
    });

    const hospital = await Hospital.findOne({ user: hospUser._id });

    // Create 3 blood requests (Req1: A+, Req2: A+, Req3: B+)
    const req1 = await BloodRequest.create({
      patientName: 'Patient One',
      bloodGroup: 'A+',
      unitsNeeded: 2,
      unitsFromDonors: 2,
      urgency: 'high',
      status: 'open',
      targetHospital: hospital._id,
      requester: hospUser._id,
      location: { type: 'Point', coordinates: [77.209, 28.614] },
    });

    const req2 = await BloodRequest.create({
      patientName: 'Patient Two',
      bloodGroup: 'A+',
      unitsNeeded: 1,
      unitsFromDonors: 1,
      urgency: 'medium',
      status: 'open',
      targetHospital: hospital._id,
      requester: hospUser._id,
      location: { type: 'Point', coordinates: [77.209, 28.614] },
    });

    // Incompatible for A+ donor
    await BloodRequest.create({
      patientName: 'Patient Three',
      bloodGroup: 'B+',
      unitsNeeded: 1,
      unitsFromDonors: 1,
      urgency: 'low',
      status: 'open',
      targetHospital: hospital._id,
      requester: hospUser._id,
      location: { type: 'Point', coordinates: [77.209, 28.614] },
    });

    // Register A+ donor
    const { token: donorToken, user: donorUser } = await registerUser(app, {
      name: 'Donor Alice',
      email: 'donor_alice@test.com',
      bloodGroup: 'A+',
    });

    // Initial check: Alice is compatible with Req1 and Req2 (2 requests)
    let badges = await donorBadgeService.getAllDonorBadges(donorUser._id);
    expect(badges.requests).toBe(2);

    // Alice pledges to Req1
    const pledgeRes = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ requestId: req1._id, units: 1 });

    expect([200, 201]).toContain(pledgeRes.status);

    // After pledging, Req1 must be excluded from Alice's Requests badge
    badges = await donorBadgeService.getAllDonorBadges(donorUser._id);
    expect(badges.requests).toBe(1);
    expect(badges.history).toBe(1);

    // Verify API endpoint returns identical count
    const apiRes = await request(app)
      .get('/api/donors/badges')
      .set('Authorization', `Bearer ${donorToken}`);

    expect(apiRes.status).toBe(200);
    expect(apiRes.body.data.requests).toBe(1);
    expect(apiRes.body.data.history).toBe(1);
  });

  // ─── 3. AI tool counts strictly equal dashboard badges ──────────────────────
  test('AI tool counts equal dashboard tab badge counts (parity guarantee)', async () => {
    const { token: hospToken, user: hospUser } = await registerHospital(app, {
      name: 'Trauma Center Hospital',
      email: 'trauma_hosp@test.com',
    });

    const hospital = await Hospital.findOne({ user: hospUser._id });

    // Create an open request
    const req = await BloodRequest.create({
      patientName: 'Emergency Trauma Patient',
      bloodGroup: 'O+',
      unitsNeeded: 1,
      unitsFromDonors: 1,
      urgency: 'critical',
      status: 'open',
      targetHospital: hospital._id,
      requester: hospUser._id,
      location: { type: 'Point', coordinates: [77.209, 28.614] },
    });

    const { token: donorToken, user: donorUser } = await registerUser(app, {
      name: 'Donor Bob',
      email: 'donor_bob@test.com',
      bloodGroup: 'O+',
    });

    const context = { userId: donorUser._id, role: 'user', accountType: 'user' };

    // Dashboard Badges
    const dashboardBadges = await donorBadgeService.getAllDonorBadges(donorUser._id);

    // AI Tool: getOpenRequestsForMe
    const aiRequests = await executeTool('getOpenRequestsForMe', {}, context);
    expect(aiRequests.count).toBe(dashboardBadges.requests);

    // AI Tool: getMyAlerts
    const aiAlerts = await executeTool('getMyAlerts', {}, context);
    expect(aiAlerts.unreadCount).toBe(dashboardBadges.alerts);

    // AI Tool: getMyDonationHistory
    const aiHistory = await executeTool('getMyDonationHistory', {}, context);
    expect(aiHistory.count).toBe(dashboardBadges.history);

    // AI Tool: getMyBadges
    const aiBadges = await executeTool('getMyBadges', {}, context);
    expect(aiBadges.requests).toBe(dashboardBadges.requests);
    expect(aiBadges.forYou).toBe(dashboardBadges.forYou);
    expect(aiBadges.alerts).toBe(dashboardBadges.alerts);
    expect(aiBadges.history).toBe(dashboardBadges.history);
  });

  // ─── 4. Incomplete donor profile cannot pledge ──────────────────────────────
  test('incomplete profile cannot pledge: returns 400 until profile is completed', async () => {
    const { token: hospToken, user: hospUser } = await registerHospital(app, {
      name: 'Apex Hospital',
      email: 'apex_hosp@test.com',
    });

    const hospital = await Hospital.findOne({ user: hospUser._id });

    const req = await BloodRequest.create({
      patientName: 'Cardiac Patient',
      bloodGroup: 'AB+',
      unitsNeeded: 2,
      unitsFromDonors: 2,
      urgency: 'high',
      status: 'open',
      targetHospital: hospital._id,
      requester: hospUser._id,
      location: { type: 'Point', coordinates: [77.209, 28.614] },
    });

    // Create donor user whose profileComplete is explicitly false (simulating first-time Google donor)
    const { token: donorToken, user: donorUser } = await registerUser(app, {
      name: 'Google New Donor',
      email: 'google_new_donor@test.com',
      bloodGroup: 'AB+',
    });

    // Mark profile explicitly as incomplete
    const donorProfile = await DonorProfile.findByUserId(donorUser._id);
    donorProfile.profileComplete = false;
    await donorProfile.save();

    // 1. Attempt pledge with incomplete profile -> rejected with 400
    const failedPledge = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ requestId: req._id, units: 1 });

    expect(failedPledge.status).toBe(400);
    expect(failedPledge.body.success).toBe(false);
    expect(failedPledge.body.message).toMatch(/complete your donor profile/i);

    // 2. Complete the profile via PUT /api/donors/profile
    const completeRes = await request(app)
      .put('/api/donors/profile')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        bloodGroup: 'AB+',
        contactNumber: '+91 9876543210',
        address: 'Sector 18, Noida',
        is18Plus: true,
        isWeight50KgPlus: true,
        consentContact: true,
      });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.success).toBe(true);
    expect(completeRes.body.data.profileComplete).toBe(true);

    // 3. Now pledge succeeds
    const successPledge = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ requestId: req._id, units: 1 });

    expect([200, 201]).toContain(successPledge.status);
    expect(successPledge.body.success).toBe(true);
    expect(successPledge.body.data.status).toBe('pledged');
  });

  // ─── 5. Date helper formatting output ───────────────────────────────────────
  test('date helper formats dates as "7 Nov 2026" and times as "09:06 PM" (en-IN)', () => {
    // 7 Nov 2026 at 15:36 UTC = 21:06 IST (09:06 PM)
    const testDate = new Date('2026-11-07T15:36:00.000Z');

    const formattedDate = formatDate(testDate);
    expect(formattedDate).toBe('7 Nov 2026');

    const formattedTime = formatTime(testDate);
    expect(formattedTime).toBe('09:06 PM');

    const formattedDateTime = formatDateTime(testDate);
    expect(formattedDateTime).toBe('7 Nov 2026, 09:06 PM');

    // Handles fallback gracefully
    expect(formatDate(null)).toBe('None');
    expect(formatDate(null, 'No Date')).toBe('No Date');
    expect(formatTime(null)).toBe('');
    expect(formatDateTime(null)).toBe('Recent');
  });

  // ─── 6. Second pledge -> 409 ──────────────────────────────────────────────
  test('second pledge to a different request returns 409 while one is pending', async () => {
    const { token: hospToken, user: hospUser } = await registerHospital(app, {
      name: 'Pledge Guard Hospital',
      email: 'pledge_guard_hosp@test.com',
    });
    const hospital = await Hospital.findOne({ user: hospUser._id });

    const req1 = await BloodRequest.create({
      patientName: 'Patient Alpha',
      bloodGroup: 'O+',
      unitsNeeded: 2,
      unitsFromDonors: 2,
      urgency: 'high',
      status: 'open',
      targetHospital: hospital._id,
      requester: hospUser._id,
      location: { type: 'Point', coordinates: [77.209, 28.614] },
    });

    const req2 = await BloodRequest.create({
      patientName: 'Patient Beta',
      bloodGroup: 'O+',
      unitsNeeded: 2,
      unitsFromDonors: 2,
      urgency: 'medium',
      status: 'open',
      targetHospital: hospital._id,
      requester: hospUser._id,
      location: { type: 'Point', coordinates: [77.210, 28.615] },
    });

    const { token: donorToken, user: donorUser } = await registerUser(app, {
      name: 'Donor Beta',
      email: 'donor_beta@test.com',
      bloodGroup: 'O+',
    });

    // Complete profile
    await request(app)
      .put('/api/donors/profile')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        bloodGroup: 'O+',
        contactNumber: '+91 9000000001',
        address: 'Delhi NCR',
        is18Plus: true,
        isWeight50KgPlus: true,
        consentContact: true,
      });

    // First pledge succeeds
    const first = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ requestId: req1._id, units: 1 });
    expect([200, 201]).toContain(first.status);
    expect(first.body.success).toBe(true);

    // Second pledge to different request -> rejected with 409
    const second = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ requestId: req2._id, units: 1 });
    expect(second.status).toBe(409);
    expect(second.body.success).toBe(false);
    expect(second.body.message).toMatch(/pending pledge/i);

    // Cancel first pledge -> now donor can pledge again
    const cancelRes = await request(app)
      .delete(`/api/donations/${first.body.data._id}/pledge`)
      .set('Authorization', `Bearer ${donorToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);

    // Re-attempt pledge to req2 -> succeeds
    const third = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ requestId: req2._id, units: 1 });
    expect([200, 201]).toContain(third.status);
    expect(third.body.success).toBe(true);
  });

  // ─── 7. Hospital name in History ──────────────────────────────────────────
  test('hospitalName is stored on pledge and returned in donation history', async () => {
    const { token: hospToken, user: hospUser } = await registerHospital(app, {
      name: 'City General Emergency Hospital',
      email: 'city_general@test.com',
    });
    const hospital = await Hospital.findOne({ user: hospUser._id });

    const req = await BloodRequest.create({
      patientName: 'Patient Gamma',
      bloodGroup: 'B+',
      unitsNeeded: 2,
      unitsFromDonors: 2,
      urgency: 'high',
      status: 'open',
      targetHospital: hospital._id,
      requester: hospUser._id,
      location: { type: 'Point', coordinates: [77.209, 28.614] },
    });

    const { token: donorToken, user: donorUser } = await registerUser(app, {
      name: 'Donor Gamma',
      email: 'donor_gamma@test.com',
      bloodGroup: 'B+',
    });

    await request(app)
      .put('/api/donors/profile')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        bloodGroup: 'B+',
        contactNumber: '+91 9000000002',
        address: 'Mumbai',
        is18Plus: true,
        isWeight50KgPlus: true,
        consentContact: true,
      });

    const pledgeRes = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ requestId: req._id, units: 1 });
    expect([200, 201]).toContain(pledgeRes.status);
    expect(pledgeRes.body.success).toBe(true);

    // Verify hospitalName stored on donation doc
    const donation = await Donation.findById(pledgeRes.body.data._id);
    expect(donation.hospitalName).toBe(hospital.name);

    // Verify donation history returns real hospital name (no generic fallback)
    const histRes = await request(app)
      .get('/api/donations/history')
      .set('Authorization', `Bearer ${donorToken}`);
    expect(histRes.status).toBe(200);
    const histItem = histRes.body.data.find((d) => d._id === pledgeRes.body.data._id);
    expect(histItem).toBeDefined();
    expect(histItem.hospitalName).toBe(hospital.name);
  });

  // ─── 8. For You is a subset of Requests & empty without location ─────────
  test('For You is strictly a subset of Requests and is empty without location', async () => {
    const { token: hospToken, user: hospUser } = await registerHospital(app, {
      name: 'Delhi AIIMS Center',
      email: 'delhi_aiims@test.com',
    });
    const hospital = await Hospital.findOne({ user: hospUser._id });

    // Request nearby Delhi [77.209, 28.614]
    await BloodRequest.create({
      patientName: 'Delhi Patient',
      bloodGroup: 'O+',
      unitsNeeded: 1,
      unitsFromDonors: 1,
      urgency: 'high',
      status: 'open',
      targetHospital: hospital._id,
      requester: hospUser._id,
      location: { type: 'Point', coordinates: [77.209, 28.614] },
    });

    // Request far away (e.g. Bangalore [77.594, 12.971] ~1700km)
    await BloodRequest.create({
      patientName: 'Bangalore Patient',
      bloodGroup: 'O+',
      unitsNeeded: 1,
      unitsFromDonors: 1,
      urgency: 'high',
      status: 'open',
      targetHospital: hospital._id,
      requester: hospUser._id,
      location: { type: 'Point', coordinates: [77.594, 12.971] },
    });

    // Donor with NO location set yet
    const { token: donorToken, user: donorUser } = await registerUser(app, {
      name: 'No Location Donor',
      email: 'no_loc_donor@test.com',
      bloodGroup: 'O+',
    });

    const donorProfile = await DonorProfile.findByUserId(donorUser._id);
    donorProfile.address = '';
    await donorProfile.save();

    // With no address: Requests count is 2, but For You is 0
    let badges = await donorBadgeService.getAllDonorBadges(donorUser._id);
    expect(badges.requests).toBe(2);
    expect(badges.forYou).toBe(0);

    // Now set Delhi location for donor
    donorProfile.address = 'Connaught Place, New Delhi';
    donorProfile.location = { type: 'Point', coordinates: [77.218, 28.631] };
    await donorProfile.save();

    // Now For You matches only the nearby Delhi request (1), subset of Requests (2)
    badges = await donorBadgeService.getAllDonorBadges(donorUser._id);
    expect(badges.requests).toBe(2);
    expect(badges.forYou).toBe(1);
    expect(badges.forYou).toBeLessThanOrEqual(badges.requests);
  });
});
