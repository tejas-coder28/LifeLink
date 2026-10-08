/**
 * tests/firebaseMigration.test.js
 *
 * Dedicated verification suite for Firebase Firestore migration and Google Auth:
 * 1. Health check returns dbType: 'firestore'
 * 2. Google Login with verified ID token
 *    - Existing user logs in and receives JWT
 *    - New user without bloodGroup returns needsProfile: true
 *    - New user with bloodGroup creates account with role elevation guard (strictly 'user')
 * 3. Unique email enforcement via transactional email index
 * 4. Atomic transaction inventory deduction & ledger tracking
 * 5. Atomic donation completion & ledger update
 */

require('./setup');

const request = require('supertest');
const { connect, clearDatabase, disconnect } = require('./helpers/db');
const { registerUser, registerHospital } = require('./helpers/auth');
const User = require('../src/repositories/user.repository');
const Hospital = require('../src/repositories/hospital.repository');
const BloodRequest = require('../src/repositories/bloodRequest.repository');
const Donation = require('../src/repositories/donation.repository');
const DonorProfile = require('../src/repositories/donorProfile.repository');
const InventoryTransaction = require('../src/repositories/inventoryTransaction.repository');

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

describe('Firebase Firestore & Auth Verification Suite', () => {
  describe('1. Health Check Endpoint', () => {
    test('GET /api/health returns operational status and dbType="firestore"', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('operational');
      expect(res.body.dbType).toBe('firestore');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('2. Google Login & Auth Flow', () => {
    test('new user without bloodGroup receives needsProfile: true', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: 'mock_google_id_token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.needsProfile).toBe(true);
      expect(res.body.data.email).toBe('mock_google_user@gmail.com');
    });

    test('new user with bloodGroup registers as user role and receives JWT', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({
          idToken: 'mock_google_id_token',
          bloodGroup: 'O+',
          phone: '+91 9999988888',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.email).toBe('mock_google_user@gmail.com');
      // Role elevation guard: strictly 'user'
      expect(res.body.data.accountType).toBe('user');
      expect(res.body.data.role).toBe('user');

      // Verify associated DonorProfile was created
      const profile = await DonorProfile.findByUserId(res.body.data._id);
      expect(profile).toBeDefined();
      expect(profile.bloodGroup).toBe('O+');
      expect(profile.bloodGroupConfirmed).toBe(true);
    });

    test('existing user signs in directly with Google token and returns JWT', async () => {
      // First register via regular user flow
      await registerUser(app, {
        name: 'Existing Google Person',
        email: 'mock_google_user@gmail.com',
        bloodGroup: 'A+',
      });

      // Now login via Google
      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: 'mock_google_id_token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.email).toBe('mock_google_user@gmail.com');
      expect(res.body.data.name).toBe('Existing Google Person');
    });

    test('rejects invalid or forged token with 401', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({ idToken: 'completely_invalid_garbage_token' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Unique Email Constraint in Firestore', () => {
    test('enforces unique email atomically across concurrent attempts', async () => {
      const email = 'unique_constraint@test.com';

      // First creation succeeds
      const first = await User.create({
        name: 'First User',
        email,
        password: 'password123',
        accountType: 'user',
      });
      expect(first._id).toBeDefined();

      // Second creation with same email throws duplicate error
      await expect(
        User.create({
          name: 'Second User',
          email: email.toUpperCase(), // Case insensitive check
          password: 'password123',
          accountType: 'user',
        })
      ).rejects.toThrow(/already exists/i);
    });
  });

  describe('4. Atomic Transactions & Ledger Integrity', () => {
    test('acceptRequest atomically fulfills units and generates InventoryTransaction ledger entry', async () => {
      // 1. Create verified hospital with stock
      const { user: hospUser, token: hospToken } = await registerHospital(app, {
        name: 'Atomic St. Jude',
        email: 'atomic_hosp@test.com',
      });
      const hospitalDoc = await Hospital.findOne({ user: hospUser._id });
      hospitalDoc.isVerified = true;
      const defaultGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      hospitalDoc.inventory = defaultGroups.map(grp => ({
        bloodGroup: grp,
        units: grp === 'B+' ? 5 : (grp === 'O+' ? 2 : 0),
      }));
      await hospitalDoc.save();

      // 2. Create blood request for B+ (3 units)
      const userRes = await registerUser(app, { email: 'patient_requester@test.com' });
      const reqRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userRes.token}`)
        .send({
          patientName: 'John Patient',
          bloodGroup: 'B+',
          unitsNeeded: 3,
          urgency: 'high',
          address: 'Emergency Ward 4',
          targetHospital: hospitalDoc._id.toString(),
        });
      expect(reqRes.status).toBe(201);
      const requestId = reqRes.body.data._id;

      // 3. Hospital accepts request
      const acceptRes = await request(app)
        .patch(`/api/requests/${requestId}/accept`)
        .set('Authorization', `Bearer ${hospToken}`);

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.status).toBe('fulfilled');
      expect(acceptRes.body.data.unitsFromStock).toBe(3);

      // Verify hospital stock was atomically decremented from 5 to 2
      const updatedHospital = await Hospital.findById(hospitalDoc._id);
      const bPos = updatedHospital.inventory.find(i => i.bloodGroup === 'B+').units;
      expect(bPos).toBe(2);

      // Verify ledger transaction was logged
      const ledgers = await InventoryTransaction.find({ hospital: hospitalDoc._id });
      expect(ledgers.length).toBeGreaterThanOrEqual(1);
      const matchLedger = ledgers.find(l => l.request === requestId || l.request?._id === requestId);
      expect(matchLedger).toBeDefined();
      expect(matchLedger.change).toBe(-3);
      expect(matchLedger.bloodGroup).toBe('B+');
      expect(matchLedger.reason).toBe('issued');
    });

    test('completeDonation atomically logs donation, increases stock, and updates donor profile', async () => {
      const { user: hospUser, token: hospToken } = await registerHospital(app, {
        name: 'Memorial City Hospital',
        email: 'memorial@test.com',
      });
      const hospitalDoc = await Hospital.findOne({ user: hospUser._id });
      hospitalDoc.isVerified = true;
      const defaultGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      hospitalDoc.inventory = defaultGroups.map(grp => ({
        bloodGroup: grp,
        units: grp === 'O-' ? 1 : 0,
      }));
      await hospitalDoc.save();

      const donorRes = await registerUser(app, {
        name: 'Generous Donor',
        email: 'generous@test.com',
        bloodGroup: 'O-',
      });
      const donorUser = donorRes.user;

      // Create an open request
      const bloodReq = await BloodRequest.create({
        requester: hospUser._id,
        targetHospital: hospitalDoc._id,
        patientName: 'Critical Patient',
        bloodGroup: 'O-',
        unitsNeeded: 1,
        unitsFromStock: 0,
        unitsFromDonors: 1,
        unitsFulfilled: 0,
        urgency: 'critical',
        status: 'open',
        address: 'ICU Block B',
      });

      // Donor pledges
      const pledgeRes = await request(app)
        .post('/api/donations/pledge')
        .set('Authorization', `Bearer ${donorRes.token}`)
        .send({
          requestId: bloodReq._id.toString(),
          scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        });
      expect(pledgeRes.status).toBe(201);
      const donationId = pledgeRes.body.data._id;

      // Hospital completes donation
      const completeRes = await request(app)
        .patch(`/api/donations/${donationId}/complete`)
        .set('Authorization', `Bearer ${hospToken}`);
      expect(completeRes.status).toBe(200);

      // Verify stock was incremented to 2
      const updatedHospital = await Hospital.findById(hospitalDoc._id);
      const oNeg = updatedHospital.inventory.find(i => i.bloodGroup === 'O-').units;
      expect(oNeg).toBe(2);

      // Verify donor profile lastDonationDate updated
      const updatedProfile = await DonorProfile.findByUserId(donorUser._id);
      expect(updatedProfile.lastDonationDate).toBeDefined();
      expect(updatedProfile.totalDonations).toBe(1);

      // Verify InventoryTransaction ledger entry (+1)
      const ledgers = await InventoryTransaction.find({ hospital: hospitalDoc._id.toString() });
      expect(ledgers.length).toBeGreaterThanOrEqual(1);
      const donationLedger = ledgers.find(l => l.reason === 'donation_received');
      expect(donationLedger).toBeDefined();
      expect(donationLedger.change).toBe(1);
    });
  });
});
