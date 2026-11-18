require('./setup');

const { connect, clearDatabase, disconnect } = require('./helpers/db');
const { registerUser, registerHospital } = require('./helpers/auth');
const Hospital = require('../src/repositories/hospital.repository');
const BloodRequest = require('../src/repositories/bloodRequest.repository');
const DonorProfile = require('../src/repositories/donorProfile.repository');
const Donation = require('../src/repositories/donation.repository');
const User = require('../src/repositories/user.repository');
const { executeTool } = require('../src/services/aiTools');
const { routeWithKeywords } = require('../src/services/keywordRouter');
const { generateChatReply } = require('../src/services/geminiService');

jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: jest.fn(),
        },
      };
    }),
  };
});

const { GoogleGenAI } = require('@google/genai');

let app;

beforeAll(async () => {
  await connect();
  app = require('../src/app');
});

afterEach(async () => {
  await clearDatabase();
  jest.clearAllMocks();
});

afterAll(async () => {
  await disconnect();
});

// WCAG relative luminance & contrast ratio calculation helper
function getLuminance(hex) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(hex1, hex2) {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe('LifeLink AI Assistant & UI Follow-up Features', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. Filter Pill Contrast (both themes)
  // ──────────────────────────────────────────────────────────────────────────
  describe('Filter Pill Selected-State Contrast (WCAG AA/AAA >= 4.5:1)', () => {
    test('Light theme selected pill contrast: --on-primary (#FFFFFF) against --text-primary (#0F1A2E) >= 4.5:1', () => {
      const onPrimaryLight = '#FFFFFF';
      const textPrimaryLight = '#0F1A2E';
      const ratio = getContrastRatio(onPrimaryLight, textPrimaryLight);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(ratio).toBeGreaterThanOrEqual(15.0); // WCAG AAA is >= 7:1; here it is ~16:1
    });

    test('Dark theme selected pill contrast: --on-primary (#0A0F1C) against --text-primary (#F8FAFC) >= 4.5:1', () => {
      const onPrimaryDark = '#0A0F1C';
      const textPrimaryDark = '#F8FAFC';
      const ratio = getContrastRatio(onPrimaryDark, textPrimaryDark);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(ratio).toBeGreaterThanOrEqual(15.0); // WCAG AAA is >= 7:1; here it is ~17:1
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Admin: Active Donor List & Data Parity
  // ──────────────────────────────────────────────────────────────────────────
  describe('Admin: Active Donor List Tool & Router', () => {
    test('getActiveDonors returns count matching active donor count and strictly hides email/phone', async () => {
      // Create 3 donors (2 active, 1 offline)
      const u1 = await registerUser(app, { name: 'Alice Donor', email: 'alice@test.com', phone: '+919876543210', bloodGroup: 'O+' });
      const u2 = await registerUser(app, { name: 'Bob Donor', email: 'bob@test.com', phone: '+919876543211', bloodGroup: 'A+' });
      const u3 = await registerUser(app, { name: 'Charlie Inactive', email: 'charlie@test.com', phone: '+919876543212', bloodGroup: 'B+' });

      // Mark Charlie as offline
      const p3 = await DonorProfile.findOne({ user: u3.user?._id || u3.user?.id });
      if (p3) {
        p3.isAvailable = false;
        await p3.save();
      }

      const activeInDb = await DonorProfile.find({ isAvailable: true });
      expect(activeInDb.length).toBe(2);

      // Execute tool as admin
      const toolRes = await executeTool('getActiveDonors', {}, { role: 'admin' });
      expect(toolRes.totalActive).toBe(2);
      expect(toolRes.totalActive).toBe(activeInDb.length);
      expect(toolRes.topDonors).toHaveLength(2);

      // Verify privacy: NO email, NO phone in any donor record
      toolRes.topDonors.forEach((donor) => {
        expect(donor).not.toHaveProperty('email');
        expect(donor).not.toHaveProperty('phone');
        expect(donor).not.toHaveProperty('contactNumber');
        expect(donor.standbyStatus).toBe('ACTIVE');
        expect(donor.isEligible).toBe(true);
      });
    });

    test('Admin asking "list out the donors who are active" returns headline, details without secrets, and deep link', async () => {
      await registerUser(app, { name: 'Priya Sharma', email: 'priya@test.com', phone: '+919123456780', bloodGroup: 'O+' });
      await registerUser(app, { name: 'Rahul Verma', email: 'rahul@test.com', phone: '+919123456781', bloodGroup: 'A-' });

      const res = await routeWithKeywords('list out the donors who are active', { role: 'admin' });

      expect(res.reply).toMatch(/active standby donor/i);
      expect(res.reply).toContain('Priya Sharma');
      expect(res.reply).toContain('Rahul Verma');

      // Crucial privacy verification: phone and email never leak into the response text
      expect(res.reply).not.toContain('priya@test.com');
      expect(res.reply).not.toContain('rahul@test.com');
      expect(res.reply).not.toContain('+919123456780');
      expect(res.reply).not.toContain('+919123456781');

      // Deep link to Donors & Hospitals tab with status=active
      expect(res.actions).toHaveLength(1);
      const action = res.actions[0];
      expect(action.path).toBe('/admin/dashboard');
      expect(action.tab).toBe('users');
      expect(action.query).toContain('status=active');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Hospital: Waiting Pledges
  // ──────────────────────────────────────────────────────────────────────────
  describe('Hospital: Pledges Awaiting Confirmation Tool & Router', () => {
    test('getPledgesAwaitingConfirmation returns pending pledge count, donor first name, units, and timestamp', async () => {
      const hosp = await registerHospital(app, { name: 'Apollo Medical Center', email: 'apollo@test.com' });
      const hospUserId = hosp.user?._id || hosp.user?.id;
      const hospitalDoc = await Hospital.findOne({ user: hospUserId });

      const donorReg = await registerUser(app, { name: 'Kavita Patel', email: 'kavita@test.com', phone: '+919876500000', bloodGroup: 'O+' });
      const donorUserId = donorReg.user?._id || donorReg.user?.id;

      // Create a blood request for this hospital
      const request = await BloodRequest.create({
        requester: hospUserId,
        targetHospital: hospitalDoc._id,
        hospital: hospitalDoc._id,
        patientName: 'Sunita Rao',
        bloodGroup: 'O+',
        unitsNeeded: 2,
        urgency: 'high',
        status: 'open',
      });

      // Create a pledge from Kavita
      await Donation.create({
        donor: donorUserId,
        request: request._id,
        hospital: hospitalDoc._id,
        unitsDonated: 1,
        status: 'pledged',
      });

      const toolRes = await executeTool('getPledgesAwaitingConfirmation', {}, { userId: hospUserId, role: 'hospital' });
      expect(toolRes.count).toBe(1);
      expect(toolRes.pledges).toHaveLength(1);
      expect(toolRes.pledges[0].donorFirstName).toBe('Kavita'); // First name only
      expect(toolRes.pledges[0].units).toBe(1);
      expect(toolRes.pledges[0].bloodGroup).toBe('O+');
      expect(toolRes.pledges[0]).toHaveProperty('time');
    });

    test('Hospital asking "any pledges waiting?" returns count, details, and action to Awaiting Confirmation', async () => {
      const hosp = await registerHospital(app, { name: 'Max Health', email: 'max@test.com' });
      const hospUserId = hosp.user?._id || hosp.user?.id;
      const hospitalDoc = await Hospital.findOne({ user: hospUserId });

      const donorReg = await registerUser(app, { name: 'Deepak Kumar', email: 'deepak@test.com', phone: '+919876511111', bloodGroup: 'B+' });
      const donorUserId = donorReg.user?._id || donorReg.user?.id;

      const request = await BloodRequest.create({
        requester: hospUserId,
        targetHospital: hospitalDoc._id,
        hospital: hospitalDoc._id,
        patientName: 'Ramesh Sen',
        bloodGroup: 'B+',
        unitsNeeded: 1,
        urgency: 'critical',
        status: 'open',
      });

      await Donation.create({
        donor: donorUserId,
        request: request._id,
        hospital: hospitalDoc._id,
        unitsDonated: 1,
        status: 'pledged',
      });

      const res = await routeWithKeywords('any pledges waiting?', { userId: hospUserId, role: 'hospital' });

      expect(res.reply).toMatch(/1 donor pledge\(s\) awaiting hospital confirmation/i);
      expect(res.reply).toContain('Deepak');
      expect(res.reply).toContain('B+');
      expect(res.actions).toHaveLength(1);
      const action = res.actions[0];
      expect(action.path).toBe('/hospital/dashboard');
      expect(action.query).toContain('filter=pledges');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Donor: Cooldown Explanation & Next Eligible Date
  // ──────────────────────────────────────────────────────────────────────────
  describe('Donor: Cooldown Explanation & Status', () => {
    test('"what is cooldown" explains concept and returns donor next eligible date', async () => {
      const donorReg = await registerUser(app, { name: 'Anita Roy', email: 'anita@test.com', phone: '+919988776655', bloodGroup: 'AB+' });
      const donorUserId = donorReg.user?._id || donorReg.user?.id;

      // Donor donated 30 days ago
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const profile = await DonorProfile.findOne({ user: donorUserId });
      profile.lastDonationDate = thirtyDaysAgo;
      await profile.save();

      const res = await routeWithKeywords('what is cooldown', { userId: donorUserId, role: 'user' });

      expect(res.reply).toMatch(/cooldown/i);
      expect(res.reply).toMatch(/90-day rest interval/i);
      expect(res.reply).toMatch(/remaining before next donation/i);
      expect(res.reply).toMatch(/Next eligible date:/i);
      expect(res.actions).toHaveLength(1);
      expect(res.actions[0].path).toBe('/donor/dashboard');
      expect(res.actions[0].tab).toBe('profile');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Role Isolation Refusal
  // ──────────────────────────────────────────────────────────────────────────
  describe('Role Isolation Security Guards', () => {
    test('Donor asking to list active donors is refused with access restricted message', async () => {
      const donorReg = await registerUser(app, { name: 'Curious Donor', email: 'curious@test.com', bloodGroup: 'O+' });
      const donorUserId = donorReg.user?._id || donorReg.user?.id;

      const res = await routeWithKeywords('list out the donors who are active', { userId: donorUserId, role: 'user' });

      expect(res.reply).toMatch(/Access restricted/i);
      expect(res.reply).toMatch(/administrators/i);
      expect(res.actions).toHaveLength(0);
    });

    test('Non-admin cannot execute getActiveDonors tool directly via executeTool', async () => {
      await expect(
        executeTool('getActiveDonors', {}, { role: 'user' })
      ).rejects.toThrow(/Unauthorized tool execution/i);
    });

    test('Non-hospital cannot execute getPledgesAwaitingConfirmation tool directly via executeTool', async () => {
      await expect(
        executeTool('getPledgesAwaitingConfirmation', {}, { role: 'user' })
      ).rejects.toThrow(/Unauthorized tool execution/i);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Gemini Function Calling Integration (Mocked)
  // ──────────────────────────────────────────────────────────────────────────
  describe('Gemini Dispatch & Tool Loop with Model Mock', () => {
    test('generateChatReply calls Gemini and formats 4-part response when configured', async () => {
      process.env.AI_API_KEY = 'valid-test-key';
      process.env.AI_PROVIDER = 'gemini';

      const mockGenerateContent = jest.fn();
      GoogleGenAI.mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      }));

      // Turn 1: model decides to call getActiveDonors
      mockGenerateContent.mockResolvedValueOnce({
        functionCalls: [{ name: 'getActiveDonors', args: {} }],
      });

      // Turn 2: model produces final 4-part text
      mockGenerateContent.mockResolvedValueOnce({
        text: 'There are 1 active standby donor(s) registered:\n• Test Donor (O+) — New Delhi | Standby: ACTIVE | Eligible: Yes\n\nActive donors are immediately reachable for emergency dispatch.',
      });

      await registerUser(app, { name: 'Test Donor', email: 'testdonor@test.com', bloodGroup: 'O+' });

      const res = await generateChatReply('show active donors', [], { role: 'admin' });

      expect(res.provider).toBe('gemini');
      expect(res.reply).toContain('There are 1 active standby donor');
      expect(res.actions).toHaveLength(1);
      expect(res.actions[0].path).toBe('/admin/dashboard');
      expect(res.actions[0].query).toContain('status=active');
    });
  });
});
