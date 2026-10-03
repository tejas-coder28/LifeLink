/**
 * tests/validation.test.js
 *
 * Input validation suite:
 *   - Invalid bloodGroup rejected on register
 *   - Invalid bloodGroup rejected on blood request creation
 *   - Missing required fields rejected
 */

require('./setup');

const request = require('supertest');
const { connect, clearDatabase, disconnect } = require('./helpers/db');
const { registerUser } = require('./helpers/auth');

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

// ── Registration validation ───────────────────────────────────────────────────

describe('POST /api/auth/register — validation', () => {
  const invalidGroups = ['Z+', 'X-', 'AB', 'O', 'a+', 'b-', '0+', ''];

  for (const bg of invalidGroups) {
    test(`rejects bloodGroup="${bg}" with 400`, async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Test User',
        email: `badgroup_${Math.random()}@test.com`,
        password: 'pass123',
        accountType: 'user',
        bloodGroup: bg,
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  }

  test('rejects missing name', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'noname@test.com',
      password: 'pass123',
      accountType: 'user',
      bloodGroup: 'O+',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects invalid email format', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bad Email',
      email: 'not-an-email',
      password: 'pass123',
      accountType: 'user',
      bloodGroup: 'O+',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects password shorter than 6 chars', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Short Password',
      email: 'short@test.com',
      password: 'abc',
      accountType: 'user',
      bloodGroup: 'O+',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects user registration without bloodGroup', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'No Blood Group',
      email: 'nobg@test.com',
      password: 'pass123',
      accountType: 'user',
      // bloodGroup intentionally omitted
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/blood group/i);
  });
});

// ── Blood request validation ──────────────────────────────────────────────────

describe('POST /api/requests — bloodGroup validation', () => {
  let userToken;

  beforeEach(async () => {
    const { token } = await registerUser(app, { email: 'reqval@test.com' });
    userToken = token;
  });

  test('rejects invalid bloodGroup in blood request', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        patientName: 'Test Patient',
        bloodGroup: 'INVALID',
        unitsNeeded: 2,
        urgency: 'high',
        address: '123 Hospital Street, Test City',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects missing patientName', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        bloodGroup: 'A+',
        unitsNeeded: 2,
        urgency: 'high',
        address: '123 Hospital Street, Test City',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects unitsNeeded less than 1', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        patientName: 'Test Patient',
        bloodGroup: 'A+',
        unitsNeeded: 0,
        urgency: 'high',
        address: '123 Hospital Street, Test City',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
