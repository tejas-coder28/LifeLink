/**
 * tests/roles.test.js
 *
 * Role / authorization suite:
 *   - Regular 'user' calling admin-only routes gets 403
 *   - Unverified hospital cannot POST blood requests
 */

require('./setup');

const request = require('supertest');
const { connect, clearDatabase, disconnect } = require('./helpers/db');
const { registerUser, registerHospital } = require('./helpers/auth');

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

// ─── Admin-only routes ────────────────────────────────────────────────────────

describe('Admin-only routes reject regular users with 403', () => {
  let userToken;

  beforeEach(async () => {
    const { token } = await registerUser(app);
    userToken = token;
  });

  test('DELETE /api/requests/:id returns 403 for a regular user', async () => {
    // Use a fake mongo id — the auth check fires before the DB lookup
    const fakeId = '64f1234567890abcdef01234';
    const res = await request(app)
      .delete(`/api/requests/${fakeId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('DELETE /api/hospitals/:id returns 403 for a regular user', async () => {
    const fakeId = '64f1234567890abcdef01234';
    const res = await request(app)
      .delete(`/api/hospitals/${fakeId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('PATCH /api/hospitals/:id/verify returns 403 for a regular user', async () => {
    const fakeId = '64f1234567890abcdef01234';
    const res = await request(app)
      .patch(`/api/hospitals/${fakeId}/verify`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ isVerified: true });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

// ─── Unverified hospital cannot post requests ─────────────────────────────────

describe('Unverified hospital cannot post blood requests', () => {
  test('returns 400 with verification error message', async () => {
    const { token } = await registerHospital(app, {
      name: 'Unverified Hospital',
      email: 'unverified@hosp.com',
      password: 'pass1234',
    });

    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientName: 'John Doe',
        bloodGroup: 'A+',
        unitsNeeded: 2,
        urgency: 'high',
        address: '123 Hospital Street, Delhi',
      });

    // Hospital is unverified — service throws before creating the document
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/pending admin approval|not verified|cannot post/i);
  });
});

// ─── Hospital-only routes reject regular users ────────────────────────────────

describe('Hospital-only routes reject regular users with 403', () => {
  let userToken;

  beforeEach(async () => {
    const { token } = await registerUser(app);
    userToken = token;
  });

  test('GET /api/donations/all returns 403 for regular user', async () => {
    const res = await request(app)
      .get('/api/donations/all')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
