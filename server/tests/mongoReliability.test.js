/**
 * Phase 7 Verification Suite:
 * 1. Duplicate pledge blocked by the MongoDB unique partial index
 * 2. Multi-document transaction rolls back completely on failure
 * 3. MongoDB unreachable returns clear 503 (never empty lists or silent 200)
 */
require('./setup');

const request = require('supertest');
const { connect, clearDatabase, disconnect } = require('./helpers/db');
const { registerUser, registerHospital } = require('./helpers/auth');
const { disconnectMongo, withTransaction } = require('../src/config/mongo');
const DonationModel = require('../src/models/Donation');
const Hospital = require('../src/repositories/hospital.repository');
const BloodRequest = require('../src/repositories/bloodRequest.repository');

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

describe('Phase 7: MongoDB Reliability, Unique Index & Outage Handling', () => {
  test('duplicate active pledge is blocked at the DB level by the unique partial index', async () => {
    const { user: hospUser } = await registerHospital(app, {
      name: 'Index Hospital',
      email: 'indexhosp@test.com',
    });
    const hospital = await Hospital.findByUserId(hospUser._id);
    hospital.isVerified = true;
    await hospital.save();

    const donor = await registerUser(app, {
      name: 'Index Donor',
      email: 'indexdonor@test.com',
      bloodGroup: 'O-',
    });

    const r1 = await BloodRequest.create({
      requester: hospUser._id,
      targetHospital: hospital._id,
      hospital: hospital._id,
      patientName: 'Patient A',
      bloodGroup: 'O-',
      unitsNeeded: 1,
      unitsFromDonors: 1,
      status: 'open',
    });
    const r2 = await BloodRequest.create({
      requester: hospUser._id,
      targetHospital: hospital._id,
      hospital: hospital._id,
      patientName: 'Patient B',
      bloodGroup: 'O-',
      unitsNeeded: 1,
      unitsFromDonors: 1,
      status: 'open',
    });

    // First active pledge succeeds
    await DonationModel.create({
      donor: donor.user._id,
      request: r1._id,
      unitsDonated: 1,
      status: 'pledged',
    });

    // Direct DB insert of a second active pledge MUST fail due to unique partial index
    await expect(
      DonationModel.create({
        donor: donor.user._id,
        request: r2._id,
        unitsDonated: 1,
        status: 'pledged',
      })
    ).rejects.toThrow(/E11000|duplicate key/i);

    // API attempt also returns 409
    const apiRes = await request(app)
      .post('/api/donations/pledge')
      .set('Authorization', `Bearer ${donor.token}`)
      .send({ requestId: r2._id, units: 1 });
    expect(apiRes.status).toBe(409);
  });

  test('multi-document transaction rolls back all writes when a later step fails', async () => {
    const { user: hospUser } = await registerHospital(app, {
      name: 'Rollback Hospital',
      email: 'rollbackhosp@test.com',
    });
    const hospital = await Hospital.findByUserId(hospUser._id);
    const reqDoc = await BloodRequest.create({
      requester: hospUser._id,
      targetHospital: hospital._id,
      hospital: hospital._id,
      patientName: 'Rollback Patient',
      bloodGroup: 'A+',
      unitsNeeded: 3,
      unitsFromDonors: 3,
      status: 'open',
    });

    const initialStock = hospital.inventory.find((i) => i.bloodGroup === 'A+').units;

    await expect(
      withTransaction(async (session) => {
        await Hospital.deductStock(hospital._id, 'A+', 2, session);
        await BloodRequest.findByIdAndUpdate(reqDoc._id, { unitsFulfilled: 2, status: 'partially_fulfilled' }, {}, session);
        throw new Error('Simulated failure after partial writes');
      })
    ).rejects.toThrow('Simulated failure after partial writes');

    const hospAfter = await Hospital.findById(hospital._id);
    const reqAfter = await BloodRequest.findById(reqDoc._id);

    expect(hospAfter.inventory.find((i) => i.bloodGroup === 'A+').units).toBe(initialStock);
    expect(reqAfter.unitsFulfilled).toBe(0);
    expect(reqAfter.status).toBe('open');
  });

  test('MongoDB unreachable returns clear 503 Service Unavailable, never an empty list', async () => {
    const donor = await registerUser(app, {
      name: 'Outage Donor',
      email: 'outage@test.com',
      bloodGroup: 'O+',
    });

    // Disconnect MongoDB to simulate unreachable database
    await disconnectMongo();

    try {
      const healthRes = await request(app).get('/api/health');
      expect(healthRes.status).toBe(503);
      expect(healthRes.body.success).toBe(false);
      expect(healthRes.body.status).toBe('disconnected');

      const requestsRes = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${donor.token}`);
      expect(requestsRes.status).toBe(503);
      expect(requestsRes.body.success).toBe(false);
      expect(requestsRes.body.code).toBe('DB_UNAVAILABLE');
      expect(Array.isArray(requestsRes.body.data)).toBe(false);

      const hospitalsRes = await request(app).get('/api/hospitals/verified');
      expect(hospitalsRes.status).toBe(503);
      expect(hospitalsRes.body.success).toBe(false);
      expect(hospitalsRes.body.code).toBe('DB_UNAVAILABLE');
    } finally {
      // Reconnect cleanly for subsequent cleanup/suites
      await connect();
    }
  });
});
