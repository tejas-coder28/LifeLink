require('./setup');

const { connect, clearDatabase, disconnect } = require('./helpers/db');
const { registerUser, registerHospital } = require('./helpers/auth');
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
      accountType: 'donor',
    });
    const donor1Id = donor1Reg.user?._id || donor1Reg.user?.id;
    await DonorProfile.create({
      user: donor1Id,
      bloodGroup: 'A+',
      isAvailable: true,
      address: 'Central Delhi',
    });

    const donor2Reg = await registerUser(app, {
      name: 'Donor Jane',
      email: 'jane@donor.com',
      accountType: 'donor',
    });
    const donor2Id = donor2Reg.user?._id || donor2Reg.user?.id;
    await DonorProfile.create({
      user: donor2Id,
      bloodGroup: 'B+',
      isAvailable: false, // offline
      address: 'North Delhi',
    });

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
      accountType: 'donor',
    });
    const donorId = donorReg.user?._id || donorReg.user?.id;
    await DonorProfile.create({
      user: donorId,
      bloodGroup: 'A+',
      isAvailable: true,
      address: 'Metro Region',
    });

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
});

