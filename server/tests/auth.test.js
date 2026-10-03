/**
 * tests/auth.test.js
 *
 * Authentication suite:
 *   - POST /api/auth/register — success, duplicate email, admin blocked
 *   - POST /api/auth/login   — success, bad password, unknown email
 *   - GET  /api/auth/me      — with valid token, with no token
 */

require('./setup');

const request = require('supertest');
const { connect, clearDatabase, disconnect } = require('./helpers/db');
const { registerUser } = require('./helpers/auth');

// The app is imported AFTER env vars are set (setup.js runs first)
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

// ─── Register ────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  test('registers a new user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice Donor',
      email: 'alice@test.com',
      password: 'secret99',
      accountType: 'user',
      bloodGroup: 'A+',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.email).toBe('alice@test.com');
    expect(res.body.data.accountType).toBe('user');
  });

  test('rejects duplicate email with 400', async () => {
    const payload = {
      name: 'Bob',
      email: 'bob@test.com',
      password: 'pass123',
      accountType: 'user',
      bloodGroup: 'B+',
    };

    await request(app).post('/api/auth/register').send(payload);
    const res = await request(app).post('/api/auth/register').send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('blocks admin account registration via API', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Evil Admin',
      email: 'evil@test.com',
      password: 'hacker1',
      accountType: 'admin',
      bloodGroup: 'O-',
    });

    // Validation layer rejects 'admin' as an invalid accountType value
    // (zod schema only allows 'user' | 'hospital')
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects invalid bloodGroup with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Invalid',
      email: 'invalid@test.com',
      password: 'pass123',
      accountType: 'user',
      bloodGroup: 'Z+', // invalid
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('registers a hospital account', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'City Hospital',
      email: 'city@hospital.com',
      password: 'hospital123',
      accountType: 'hospital',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.accountType).toBe('hospital');
    expect(res.body.data).toHaveProperty('token');
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    // Seed a user to log in as
    await request(app).post('/api/auth/register').send({
      name: 'Login Test User',
      email: 'login@test.com',
      password: 'loginpass',
      accountType: 'user',
      bloodGroup: 'O-',
    });
  });

  test('returns token on valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@test.com',
      password: 'loginpass',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
  });

  test('returns 401 on wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@test.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('returns 401 on unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@test.com',
      password: 'somepass',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── /me ─────────────────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  let token;

  beforeEach(async () => {
    const { token: t } = await registerUser(app, { email: 'me@test.com' });
    token = t;
  });

  test('returns current user with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('user');
  });

  test('returns 401 with no token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('returns 401 with invalid/malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer this.is.not.a.real.token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
