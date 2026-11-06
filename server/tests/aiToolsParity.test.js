require('./setup');

const { connect, clearDatabase, disconnect } = require('./helpers/db');
const { registerUser, registerHospital } = require('./helpers/auth');
const requestService = require('../src/services/request.service');
const analyticsService = require('../src/services/analytics.service');
const { getActiveRequests } = require('../src/services/aiTools/hospitalTools');
const { getOpenRequestsForMe } = require('../src/services/aiTools/userTools');
const { getPlatformStats } = require('../src/services/aiTools/adminTools');
const Hospital = require('../src/repositories/hospital.repository');
const BloodRequest = require('../src/repositories/bloodRequest.repository');
const DonorProfile = require('../src/repositories/donorProfile.repository');
const User = require('../src/repositories/user.repository');

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

describe('AI Tools Parity with UI Queries (Bug A & Data Parity)', () => {
  describe('Hospital Active Requests Parity', () => {
    test('Hospital Active Requests = 0 case: tool count equals UI count (both 0)', async () => {
      const reg = await registerHospital(app, { name: 'Metro General Hospital', email: 'metro@test.com' });
      const userId = reg.user?._id || reg.user?.id || reg.user?.user?._id || reg.user?.user?.id;
      const hospital = await Hospital.findOne({ user: userId });
      hospital.isVerified = true;
      await hospital.save();

      // UI query: getMyRequests for hospital caller, then filter by open/matching/partially_fulfilled
      const callerUser = { _id: userId, accountType: 'hospital' };
      const uiRequests = await requestService.getMyRequests(callerUser);
      const uiActiveCount = uiRequests.filter(
        (r) => r.status === 'open' || r.status === 'matching' || r.status === 'partially_fulfilled'
      ).length;

      // AI Tool execution
      const toolResult = await getActiveRequests({ userId, role: 'hospital' });

      expect(uiActiveCount).toBe(0);
      expect(toolResult.totalActive).toBe(0);
      expect(toolResult.totalActive).toBe(uiActiveCount);
      expect(toolResult.activeRequests).toHaveLength(0);
    });

    test('Hospital Active Requests > 0: tool count and UI count match exactly', async () => {
      const reg = await registerHospital(app, { name: 'City Hospital', email: 'city@test.com' });
      const userId = reg.user?._id || reg.user?.id || reg.user?.user?._id || reg.user?.user?.id;
      const hospital = await Hospital.findOne({ user: userId });
      hospital.isVerified = true;
      await hospital.save();

      // Create 1 active request for this hospital
      await BloodRequest.create({
        requester: userId,
        targetHospital: hospital._id,
        patientName: 'Jane Doe',
        bloodGroup: 'A+',
        unitsNeeded: 2,
        unitsNeededFromDonors: 2,
        unitsFulfilled: 0,
        urgency: 'high',
        status: 'open',
      });

      // Create 1 fulfilled request for this hospital (should NOT count as active in UI or tool)
      await BloodRequest.create({
        requester: userId,
        targetHospital: hospital._id,
        patientName: 'John Smith',
        bloodGroup: 'B+',
        unitsNeeded: 1,
        unitsNeededFromDonors: 0,
        unitsFulfilled: 1,
        urgency: 'low',
        status: 'fulfilled',
      });

      const callerUser = { _id: userId, accountType: 'hospital' };
      const uiRequests = await requestService.getMyRequests(callerUser);
      const uiActiveCount = uiRequests.filter(
        (r) => r.status === 'open' || r.status === 'matching' || r.status === 'partially_fulfilled'
      ).length;

      const toolResult = await getActiveRequests({ userId, role: 'hospital' });

      expect(uiActiveCount).toBe(1);
      expect(toolResult.totalActive).toBe(1);
      expect(toolResult.totalActive).toBe(uiActiveCount);
      expect(toolResult.activeRequests[0].patientName).toBe('Jane Doe');
    });
  });

  describe('Donor Open Requests Parity', () => {
    test('Donor Requests badge: tool finds same count as UI query', async () => {
      // Register donor
      const donorReg = await registerUser(app, { email: 'donor@test.com', name: 'Alex Donor' });
      const donorUserId = donorReg.user?._id || donorReg.user?.id || donorReg.user?.user?._id || donorReg.user?.user?.id;

      // Setup donor profile with O+ blood
      await DonorProfile.findOneAndUpdate(
        { user: donorUserId },
        { bloodGroup: 'O+', isAvailable: true, location: { type: 'Point', coordinates: [77.2090, 28.6139] } },
        { upsert: true }
      );

      // Register hospital
      const hospReg = await registerHospital(app, { name: 'Apollo Center', email: 'apollo@test.com' });
      const hospUserId = hospReg.user?._id || hospReg.user?.id || hospReg.user?.user?._id || hospReg.user?.user?.id;
      const hospital = await Hospital.findOne({ user: hospUserId });
      hospital.isVerified = true;
      await hospital.save();

      // Create 1 compatible open request (O+ needs blood, canSeekDonors is true)
      await BloodRequest.create({
        requester: hospUserId,
        targetHospital: hospital._id,
        patientName: 'Critical Patient',
        bloodGroup: 'O+',
        unitsNeeded: 2,
        unitsNeededFromDonors: 2,
        unitsFulfilled: 0,
        urgency: 'critical',
        status: 'open',
      });

      // Create 1 incompatible request (AB+ request - O+ cannot receive from AB+, but wait:
      // O+ donor CAN donate to AB+ recipient! Let's use B- recipient: O+ cannot donate to B-)
      await BloodRequest.create({
        requester: hospUserId,
        targetHospital: hospital._id,
        patientName: 'Incompatible Patient',
        bloodGroup: 'B-',
        unitsNeeded: 1,
        unitsNeededFromDonors: 1,
        unitsFulfilled: 0,
        urgency: 'medium',
        status: 'open',
      });

      // UI query: getRequests with forDonor filter
      const callerUser = { _id: donorUserId, accountType: 'user', role: 'donor' };
      const uiDonorFeed = await requestService.getRequests({}, callerUser);
      // Filter by donor's blood group compatibility
      const { canDonate } = require('../src/utils/bloodCompatibility');
      const uiCompatibleCount = uiDonorFeed.filter((r) => canDonate('O+', r.bloodGroup)).length;

      // Tool call
      const toolResult = await getOpenRequestsForMe({ userId: donorUserId, role: 'donor' });

      expect(uiCompatibleCount).toBe(1);
      expect(toolResult.totalMatchingRequests).toBe(1);
      expect(toolResult.totalMatchingRequests).toBe(uiCompatibleCount);
      expect(toolResult.requests[0].bloodGroup).toBe('O+');
    });
  });

  describe('Admin Platform Stats Parity', () => {
    test('getPlatformStats returns same values as analyticsService.getSystemAnalytics()', async () => {
      const toolResult = await getPlatformStats({ role: 'admin' });
      const analyticsResult = await analyticsService.getSystemAnalytics();

      expect(toolResult.totalDonors).toBe(analyticsResult.summary.totalDonors);
      expect(toolResult.availableDonors).toBe(analyticsResult.summary.availableDonors);
      expect(toolResult.totalRequests).toBe(analyticsResult.summary.totalRequests);
      expect(toolResult.fulfilledRequests).toBe(analyticsResult.summary.fulfilledRequests);
      expect(toolResult.openRequests).toBe(analyticsResult.summary.openRequests);
      expect(toolResult.fulfillmentRate).toBe(`${analyticsResult.summary.fulfillmentRate}%`);
    });
  });
});
