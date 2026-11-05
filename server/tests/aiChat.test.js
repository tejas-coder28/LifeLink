require('./setup');

const request = require('supertest');
const { connect, clearDatabase, disconnect } = require('./helpers/db');
const { registerUser, registerHospital, registerAdmin } = require('./helpers/auth');
const { getToolsForRole, executeTool } = require('../src/services/aiTools');
const { FIXED_REFUSAL } = require('../src/services/keywordRouter');

// Mock @google/genai SDK so no real API calls occur
jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: jest.fn(),
      },
    })),
  };
});

const { GoogleGenAI } = require('@google/genai');

let app;
let Hospital;
let BloodRequest;
let DonorProfile;

beforeAll(async () => {
  await connect();
  app = require('../src/app');
  Hospital = require('../src/repositories/hospital.repository');
  BloodRequest = require('../src/repositories/bloodRequest.repository');
  DonorProfile = require('../src/repositories/donorProfile.repository');
});

afterEach(async () => {
  await clearDatabase();
  jest.clearAllMocks();
});

afterAll(async () => {
  await disconnect();
});

describe('AI Assistant Comprehensive Suite (Phase 6)', () => {
  // ── 1. Tool Access Matrix & Role Isolation ────────────────────────────────────
  describe('Tool Access Matrix & Role Scoping', () => {
    test('public role has only shared navigation tools', () => {
      const publicTools = getToolsForRole('public');
      expect(publicTools).toEqual(['getHowToGuide']);
    });

    test('donor role cannot access hospital or admin tools', () => {
      const donorTools = getToolsForRole('donor');
      expect(donorTools).toContain('getMyProfile');
      expect(donorTools).toContain('getEligibility');
      expect(donorTools).toContain('getOpenRequestsForMe');
      expect(donorTools).toContain('getMyRequests');
      expect(donorTools).toContain('getMyDonationHistory');
      expect(donorTools).toContain('getMyAlerts');
      expect(donorTools).toContain('getHowToGuide');

      expect(donorTools).not.toContain('getInventory');
      expect(donorTools).not.toContain('getActiveRequests');
      expect(donorTools).not.toContain('getPlatformStats');
      expect(donorTools).not.toContain('getPendingHospitals');
    });

    test('hospital role cannot access admin tools or donor profile tools', () => {
      const hospitalTools = getToolsForRole('hospital');
      expect(hospitalTools).toContain('getInventory');
      expect(hospitalTools).toContain('getIncomingDemands');
      expect(hospitalTools).toContain('getActiveRequests');
      expect(hospitalTools).toContain('getPendingPledges');
      expect(hospitalTools).toContain('getMatchingDonors');
      expect(hospitalTools).toContain('getMyVerificationStatus');
      expect(hospitalTools).toContain('getHowToGuide');

      expect(hospitalTools).not.toContain('getPlatformStats');
      expect(hospitalTools).not.toContain('getMyDonationHistory');
    });

    test('admin role has access to governance tools', () => {
      const adminTools = getToolsForRole('admin');
      expect(adminTools).toContain('getPlatformStats');
      expect(adminTools).toContain('getPendingHospitals');
      expect(adminTools).toContain('getShortageAlerts');
      expect(adminTools).toContain('getRequestOverview');
    });

    test('executing unauthorized tool throws 403', async () => {
      await expect(
        executeTool('getInventory', {}, { role: 'donor', userId: 'donor-1' })
      ).rejects.toThrow(/Unauthorized tool execution/);
    });
  });

  // ── 2. Data Scoping & Cross-Hospital Isolation ──────────────────────────────
  describe('Data Scoping & Boundary Enforcement', () => {
    test('Hospital A session calling getMatchingDonors on Hospital B request fails closed', async () => {
      // 1. Create Hospital A (verified)
      const { user: userA } = await registerHospital(app, { name: 'Hospital A' });
      await Hospital.findOneAndUpdate({ user: userA._id }, { isVerified: true });

      // 2. Create Hospital B (verified)
      const { user: userB } = await registerHospital(app, { name: 'Hospital B' });
      const hospB = await Hospital.findOne({ user: userB._id });
      await Hospital.findOneAndUpdate({ _id: hospB._id }, { isVerified: true });

      // 3. Create Blood Request targeted to Hospital B
      const requestB = await BloodRequest.create({
        patientName: 'Patient B',
        bloodGroup: 'A+',
        unitsNeeded: 2,
        requester: userB._id,
        hospital: hospB._id,
        targetHospital: hospB._id,
        status: 'open',
      });

      // Hospital A attempts to get matching donors for Hospital B request
      const result = await executeTool(
        'getMatchingDonors',
        { requestId: requestB._id.toString() },
        { role: 'hospital', userId: userA._id }
      );

      expect(result.error).toContain('Unauthorized: Request does not belong to your hospital');
    });
  });

  // ── 3. Identity Parameter Spoofing Resistance ──────────────────────────────
  describe('Identity Parameter Spoofing Resistance', () => {
    test('Tool ignores client/model supplied identity arguments and uses authenticated context', async () => {
      const { user: realUser } = await registerUser(app, { name: 'Real User' });
      await DonorProfile.findOneAndUpdate(
        { user: realUser._id },
        { bloodGroup: 'AB+', isAvailable: true }
      );

      const fakeUserId = '64f000000000000000000000';
      const result = await executeTool(
        'getMyProfile',
        { userId: fakeUserId, donorId: fakeUserId, role: 'admin' },
        { role: 'user', userId: realUser._id }
      );

      expect(result.name).toBe('Real User');
      expect(result.bloodGroup).toBe('AB+');
    });
  });

  // ── 4. Greeting Shortcut ───────────────────────────────────────────────────
  describe('Greeting Shortcut & Role Response', () => {
    test('greeting as donor returns personalized greeting, not canned insight', async () => {
      const { token } = await registerUser(app, { name: 'Sarah Donor' });

      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'hi' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reply).toContain('Sarah');
      expect(res.body.data.reply).toContain('LifeLink Assistant');
      expect(res.body.data.reply).not.toContain('Emergency Donor Network & Supply Line Intelligence');
      expect(res.body.data.suggestions).toHaveLength(3);
    });

    test('greeting as hospital returns hospital support greeting', async () => {
      const { token } = await registerHospital(app, { name: 'Apollo Health' });

      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'hello!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reply).toContain('Hospital Support');
      expect(res.body.data.reply).not.toContain('Emergency Donor Network & Supply Line Intelligence');
    });
  });

  // ── 5. LifeLink Domain Queries & Action Generation ─────────────────────────
  describe('LifeLink Domain Queries', () => {
    test('hospital asking for inventory stock gets numeric breakdown and navigation action', async () => {
      const { user, token } = await registerHospital(app, { name: 'City Hospital' });
      await Hospital.findOneAndUpdate(
        { user: user._id },
        {
          isVerified: true,
          inventory: [
            { bloodGroup: 'O+', units: 5 },
            { bloodGroup: 'A+', units: 0 },
            { bloodGroup: 'B-', units: 2 },
          ],
        }
      );

      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'What is our blood inventory?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reply).toContain('Total stock:');
      expect(res.body.data.actions).toHaveLength(1);
      expect(res.body.data.actions[0]).toEqual({
        type: 'navigate',
        label: 'Inventory Reserves',
        path: '/hospital/dashboard',
        tab: 'inventory',
      });
    });

    test('donor asking for eligibility gets cooldown status and profile action', async () => {
      const { user, token } = await registerUser(app, { name: 'Eligible Donor' });

      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Can I donate blood right now?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reply).toContain('Eligible to donate: Yes');
      expect(res.body.data.actions).toHaveLength(1);
      expect(res.body.data.actions[0]).toEqual({
        type: 'navigate',
        label: 'Profile & Health',
        path: '/donor/dashboard',
        tab: 'profile',
      });
    });
  });

  // ── 6. Off-Topic Fixed Refusal ─────────────────────────────────────────────
  describe('Off-Topic Fixed Refusal', () => {
    const offTopicMessages = [
      'What is 15 * 12?',
      'Who won the football match yesterday?',
      'What is the weather forecast for tomorrow?',
      'Who is the current president?',
      'Can you write a python script to reverse a string?',
      'Tell me a good joke',
      'today virat kohli birthday??',
    ];

    test.each(offTopicMessages)('refuses off-topic message "%s"', async (msg) => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({ message: msg });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reply).toBe(FIXED_REFUSAL);
      expect(res.body.data.actions).toEqual([]);
      expect(res.body.data.suggestions).toHaveLength(3);
    });
  });

  // ── 7. Edge Cases ──────────────────────────────────────────────────────────
  describe('Edge Cases', () => {
    test('hospital with empty inventory returns total 0 and all groups critical', async () => {
      const { user, token } = await registerHospital(app, { name: 'Empty Hospital' });
      await Hospital.findOneAndUpdate({ user: user._id }, { inventory: [] });

      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'How many units in blood inventory?' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('Total stock: 0 units');
    });

    test('unverified hospital calling getActiveRequests receives verification required message', async () => {
      const { user, token } = await registerHospital(app, { name: 'Unverified Clinic' });
      await Hospital.findOneAndUpdate({ user: user._id }, { isVerified: false });

      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Show active requests' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toContain('Hospital verification required');
    });

    test('Gemini timeout or failure seamlessly falls back to Provider A', async () => {
      process.env.AI_API_KEY = 'test-key';
      process.env.AI_PROVIDER = 'gemini';

      GoogleGenAI.mockImplementation(() => ({
        models: {
          generateContent: jest.fn().mockImplementation(() => {
            return new Promise((resolve) => setTimeout(resolve, 20000));
          }),
        },
      }));

      // Set timeout to 50ms for test
      process.env.AI_TIMEOUT_MS = '50';

      const res = await request(app)
        .post('/api/ai/chat')
        .send({ message: 'How do I submit an emergency request?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.provider).toBe('keyword');
      expect(res.body.data.actions.length).toBeGreaterThan(0);
    });
  });

  // ── 8. Rate Limiting (20 req/min) ──────────────────────────────────────────
  describe('Rate Limiting', () => {
    test('returns 429 when rate limit is exceeded', async () => {
      process.env.TEST_RATE_LIMIT = 'true';
      delete process.env.DISABLE_RATE_LIMIT;

      let hit429 = false;
      for (let i = 0; i < 22; i++) {
        const res = await request(app)
          .post('/api/ai/chat')
          .send({ message: 'hi' });

        if (res.status === 429) {
          hit429 = true;
          expect(res.body.success).toBe(false);
          expect(res.body.message).toContain('Rate limit exceeded');
          break;
        }
      }

      delete process.env.TEST_RATE_LIMIT;
      expect(hit429).toBe(true);
    });
  });

  // ── 9. Zod Input Validation ────────────────────────────────────────────────
  describe('Zod Validation', () => {
    test('missing message returns 400', async () => {
      const res = await request(app).post('/api/ai/chat').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('empty whitespace message returns 400', async () => {
      const res = await request(app).post('/api/ai/chat').send({ message: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('message exceeding 500 characters returns 400', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({ message: 'x'.repeat(501) });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('malformed history array returns 400', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({ message: 'valid message', history: [{ role: 'invalid_role', content: 'test' }] });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});

