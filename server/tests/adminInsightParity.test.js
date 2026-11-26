require('./setup');

const { connect, clearDatabase, disconnect } = require('./helpers/db');
const request = require('supertest');
const { registerUser, registerHospital, registerAdmin } = require('./helpers/auth');
const analyticsService = require('../src/services/analytics.service');
const aiService = require('../src/services/ai.service');
const { formatUnitsParts, formatUnits } = require('../src/config/bloodUnits');
const Hospital = require('../src/repositories/hospital.repository');
const BloodRequest = require('../src/repositories/bloodRequest.repository');
const DonorProfile = require('../src/repositories/donorProfile.repository');
const Donation = require('../src/repositories/donation.repository');

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

describe('Admin Insight & Dashboard Parity', () => {
  test('formatUnitsParts helper returns structured parts with correct singular/plural and ml volume', () => {
    const twoUnits = formatUnitsParts(2);
    expect(twoUnits.num).toBe(2);
    expect(twoUnits.unitWord).toBe('units');
    expect(twoUnits.unitsText).toBe('2 units');
    expect(twoUnits.volumeText).toBe('≈ 900 ml');
    expect(twoUnits.full).toBe('2 units (≈ 900 ml)');

    const oneUnit = formatUnitsParts(1);
    expect(oneUnit.num).toBe(1);
    expect(oneUnit.unitWord).toBe('unit');
    expect(oneUnit.unitsText).toBe('1 unit');
    expect(oneUnit.volumeText).toBe('≈ 450 ml');
    expect(oneUnit.full).toBe('1 unit (≈ 450 ml)');

    const zeroUnits = formatUnitsParts(0);
    expect(zeroUnits.unitsText).toBe('0 units');
    expect(zeroUnits.volumeText).toBe('≈ 0 ml');
  });

  test('admin insight counts equal admin stats counts for same seed data', async () => {
    // 1. Create hospital
    const hospReg = await registerHospital(app, {
      name: 'City Apex Hospital',
      email: 'apex@hospital.org',
    });
    const hospUserId = hospReg.user?._id || hospReg.user?.id || hospReg.user?.user?._id;
    const hospital = await Hospital.findOne({ user: hospUserId });
    hospital.isVerified = true;
    hospital.inventory = [
      { bloodGroup: 'A+', units: 10 },
      { bloodGroup: 'B+', units: 5 },
      { bloodGroup: 'O+', units: 8 },
      { bloodGroup: 'O-', units: 0 },
    ];
    await hospital.save();

    // 2. Create donors
    const donor1Reg = await registerUser(app, {
      name: 'Donor John',
      email: 'john@donor.com',
      accountType: 'user',
    });
    const donor1Id = donor1Reg.user?._id || donor1Reg.user?.id;
    await DonorProfile.findOneAndUpdate(
      { user: donor1Id },
      {
        bloodGroup: 'A+',
        isAvailable: true,
        address: 'Central Delhi',
      },
      { upsert: true }
    );

    const donor2Reg = await registerUser(app, {
      name: 'Donor Jane',
      email: 'jane@donor.com',
      accountType: 'user',
    });
    const donor2Id = donor2Reg.user?._id || donor2Reg.user?.id;
    await DonorProfile.findOneAndUpdate(
      { user: donor2Id },
      {
        bloodGroup: 'B+',
        isAvailable: false, // offline
        address: 'North Delhi',
      },
      { upsert: true }
    );

    // 3. Create requests
    const req1 = await BloodRequest.create({
      requester: donor1Id,
      hospital: hospital._id,
      patientName: 'Patient One',
      bloodGroup: 'A+',
      unitsNeeded: 2,
      urgency: 'critical',
      status: 'open',
    });

    const req2 = await BloodRequest.create({
      requester: donor2Id,
      hospital: hospital._id,
      patientName: 'Patient Two',
      bloodGroup: 'B+',
      unitsNeeded: 1,
      urgency: 'high',
      status: 'fulfilled',
      unitsFulfilled: 1,
    });

    // 4. Create completed donation
    await Donation.create({
      donor: donor1Id,
      request: req2._id,
      hospital: hospital._id,
      unitsDonated: 1,
      status: 'completed',
    });

    // 5. Compare analyticsService and aiService outputs
    const analytics = await analyticsService.getSystemAnalytics();
    const insights = await aiService.getLatestInsights(1);
    const latestInsight = insights[0];

    // Total donors parity
    expect(latestInsight.metrics.totalDonors).toBe(analytics.summary.totalDonors);
    expect(latestInsight.metrics.totalDonors).toBe(2);

    // Active standby donors parity
    expect(latestInsight.metrics.activeStandbyDonors).toBe(analytics.summary.availableDonors);
    expect(latestInsight.metrics.activeStandbyDonors).toBe(1);

    // Total requests parity
    expect(latestInsight.metrics.totalRequests).toBe(analytics.summary.totalRequests);
    expect(latestInsight.metrics.totalRequests).toBe(2);

    // Fulfilled requests parity
    expect(latestInsight.metrics.fulfilledRequests).toBe(analytics.summary.fulfilledRequests);
    expect(latestInsight.metrics.fulfilledRequests).toBe(1);

    // Fulfillment rate parity
    expect(latestInsight.metrics.fulfillmentRate).toBe(`${analytics.summary.fulfillmentRate}%`);
    expect(latestInsight.metrics.fulfillmentRate).toBe('50%');

    // Summary text verifies exact matching figures
    expect(latestInsight.summary).toContain(`${analytics.summary.totalDonors} registered donors`);
    expect(latestInsight.summary).toContain(`${analytics.summary.availableDonors} active on standby`);
    expect(latestInsight.summary).toContain(`${analytics.summary.fulfillmentRate}%`);

    // Never call blood groups "rare"
    expect(latestInsight.summary.toLowerCase()).not.toContain('rare');
    for (const rec of (latestInsight.recommendations || [])) {
      expect(rec.toLowerCase()).not.toContain('rare');
    }
  });

  test('shortages are strictly computed on real inventory and requests (no campaign for groups with stock or donors)', async () => {
    const hospReg = await registerHospital(app, {
      name: 'Metro City Hospital',
      email: 'metro@hospital.org',
    });
    const hospUserId = hospReg.user?._id || hospReg.user?.id || hospReg.user?.user?._id;
    const hospital = await Hospital.findOne({ user: hospUserId });
    hospital.isVerified = true;
    hospital.inventory = [
      { bloodGroup: 'A+', units: 20 },
      { bloodGroup: 'O-', units: 0 },
    ];
    await hospital.save();

    const donorReg = await registerUser(app, {
      name: 'Donor Alex',
      email: 'alex@donor.com',
      accountType: 'user',
    });
    const donorId = donorReg.user?._id || donorReg.user?.id;
    await DonorProfile.findOneAndUpdate(
      { user: donorId },
      {
        bloodGroup: 'A+',
        isAvailable: true,
        address: 'Metro Region',
      },
      { upsert: true }
    );

    // Request for A+ (2 units). Hospital has 20 units and 1 donor -> NO shortage!
    await BloodRequest.create({
      requester: donorId,
      hospital: hospital._id,
      patientName: 'Patient In Need A+',
      bloodGroup: 'A+',
      unitsNeeded: 2,
      urgency: 'critical',
      status: 'open',
    });

    // Request for O- (2 units). Hospital has 0 units and 0 donors -> REAL SHORTAGE!
    await BloodRequest.create({
      requester: donorId,
      hospital: hospital._id,
      patientName: 'Patient In Need O-',
      bloodGroup: 'O-',
      unitsNeeded: 2,
      urgency: 'critical',
      status: 'open',
    });

    const analytics = await analyticsService.getSystemAnalytics();
    expect(analytics.shortageGroups).toContain('O-');
    expect(analytics.shortageGroups).not.toContain('A+');

    const insights = await aiService.getLatestInsights(1);
    const latestInsight = insights[0];

    // Summary alerts for O- but not A+
    expect(latestInsight.summary).toContain('Shortage alert identified for blood group(s): O-');
    expect(latestInsight.summary).not.toContain('A+');
    expect(latestInsight.summary.toLowerCase()).not.toContain('rare');
  });

  test('AI Insights routes require admin role (401/403 for non-admins) and respond meaningfully to customPrompt', async () => {
    const hospReg = await registerHospital(app, {
      name: 'Central Reserve Hospital',
      email: 'central@hospital.org',
    });
    const hospUserId = hospReg.user?._id || hospReg.user?.id || hospReg.user?.user?._id;
    const hospital = await Hospital.findOne({ user: hospUserId });
    hospital.isVerified = true;
    hospital.inventory = [
      { bloodGroup: 'O-', units: 0 },
      { bloodGroup: 'B+', units: 16 },
    ];
    await hospital.save();

    const { token: userToken, user: donorData } = await registerUser(app, {
      name: 'Donor Sam',
      email: 'sam@donor.com',
      accountType: 'user',
    });
    const donorId = donorData?._id || donorData?.id || donorData?.user?._id;

    await BloodRequest.create({
      requester: donorId,
      hospital: hospital._id,
      patientName: 'Urgent Trauma',
      bloodGroup: 'O-',
      unitsNeeded: 2,
      urgency: 'critical',
      status: 'open',
    });

    const { token: adminToken } = await registerAdmin(app, { email: 'sysadmin@lifelink.com' });

    // Unauthenticated rejected
    const unauthGet = await request(app).get('/api/ai/insights');
    expect(unauthGet.status).toBe(401);

    // Non-admin user & hospital rejected
    const userGet = await request(app).get('/api/ai/insights').set('Authorization', `Bearer ${userToken}`);
    expect(userGet.status).toBe(403);
    const hospPost = await request(app)
      .post('/api/ai/insights')
      .set('Authorization', `Bearer ${hospReg.token}`)
      .send({ prompt: 'Focus on O- stock' });
    expect(hospPost.status).toBe(403);

    // Admin custom prompt generation succeeds and tailors output cleanly
    const adminPost = await request(app)
      .post('/api/ai/insights')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ prompt: 'Focus on O- blood stock and open requests' });

    expect(adminPost.status).toBe(201);
    const created = adminPost.body.data;
    expect(created.title).toContain('Focus on O- blood stock and open requests');
    expect(created.summary).toContain('O-');
    expect(created.summary).toContain('Hospital stock status');
    expect(created.summary.toLowerCase()).not.toContain('rare');
    expect(created.metrics.highRiskBloodGroups).toContain('O-');
    expect(created.metrics.surplusGroups).not.toContain('O-');
    expect(created.metrics.totalInventoryUnits).toBe(16);
    expect(created.metrics.openRequests).toBe(1);
  });

  test('getLatestInsights automatically regenerates when openRequests count drifts', async () => {
    const { user: donorData } = await registerUser(app, { email: 'drift@donor.com' });
    const donorId = donorData?._id || donorData?.id || donorData?.user?._id;

    const reqDoc = await BloodRequest.create({
      requester: donorId,
      patientName: 'Open Case',
      bloodGroup: 'B+',
      unitsNeeded: 1,
      urgency: 'high',
      status: 'open',
    });

    const firstBatch = await aiService.getLatestInsights(10);
    expect(firstBatch[0].metrics.openRequests).toBe(1);

    await BloodRequest.findByIdAndUpdate(reqDoc._id, { status: 'closed' });
    const refreshedBatch = await aiService.getLatestInsights(10);
    expect(refreshedBatch[0].metrics.openRequests).toBe(0);
  });
});

