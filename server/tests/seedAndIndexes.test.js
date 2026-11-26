require('./setup');
const { connect, clearDatabase, disconnect } = require('./helpers/db');
const seedData = require('../src/seed');
const { checkMongoIndexes } = require('../src/utils/indexChecker');
const User = require('../src/repositories/user.repository');
const Hospital = require('../src/repositories/hospital.repository');
const DonorProfile = require('../src/repositories/donorProfile.repository');
const BloodRequest = require('../src/repositories/bloodRequest.repository');
const { DONATION_COOLDOWN_DAYS } = require('../src/utils/bloodCompatibility');

beforeAll(async () => {
  await connect();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnect();
});

describe('Phase 6: Seed, Demo Mix, Reset, and MongoDB Index Checker', () => {
  test('seedData populates demo mix (eligible, cooldown, never-donated, 8-group hospital, sample requests) and reset works', async () => {
    await seedData({ shouldExit: false, reset: false });

    const usersCount = await User.countDocuments();
    expect(usersCount).toBeGreaterThanOrEqual(6);

    // Demo hospital with 8 blood groups
    const hospUser = await User.findByEmail('hospital@lifelink.com');
    const hospital = await Hospital.findByUserId(hospUser._id);
    expect(hospital).toBeDefined();
    expect(hospital.isVerified).toBe(true);
    expect(hospital.inventory).toHaveLength(8);

    // Eligible donor (user@lifelink.com)
    const eligibleUser = await User.findByEmail('user@lifelink.com');
    const eligibleDp = await DonorProfile.findByUserId(eligibleUser._id);
    expect(eligibleDp.lastDonationDate).toBeInstanceOf(Date);
    const eligibleDays = Math.floor((Date.now() - eligibleDp.lastDonationDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(eligibleDays).toBeGreaterThanOrEqual(DONATION_COOLDOWN_DAYS);

    // Never-donated donor (donor2@lifelink.com)
    const neverUser = await User.findByEmail('donor2@lifelink.com');
    const neverDp = await DonorProfile.findByUserId(neverUser._id);
    expect(neverDp.lastDonationDate).toBeNull();

    // Cooldown donor (donor4@lifelink.com)
    const cooldownUser = await User.findByEmail('donor4@lifelink.com');
    const cooldownDp = await DonorProfile.findByUserId(cooldownUser._id);
    expect(cooldownDp.lastDonationDate).toBeInstanceOf(Date);
    const cooldownDays = Math.floor((Date.now() - cooldownDp.lastDonationDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(cooldownDays).toBeLessThan(DONATION_COOLDOWN_DAYS);

    // Sample requests
    const reqs = await BloodRequest.find();
    expect(reqs.length).toBeGreaterThanOrEqual(2);

    // Reset mode clears and re-seeds cleanly
    await seedData({ shouldExit: false, reset: true });
    expect(await User.countDocuments()).toBe(usersCount);
  });

  test('checkMongoIndexes syncs and verifies all schema indexes including partial unique pledge index', async () => {
    const report = await checkMongoIndexes({ sync: true, quiet: true });
    expect(report.collections.length).toBe(11);
    const donationInfo = report.collections.find((c) => c.model === 'Donation');
    expect(donationInfo).toBeDefined();
    expect(donationInfo.indexes).toContain('unique_active_pledge_per_donor');
  });
});
