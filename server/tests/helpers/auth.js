/**
 * tests/helpers/auth.js
 *
 * Shared helpers for creating seeded users and generating JWT tokens
 * without touching the real database.
 */

const request = require('supertest');

/**
 * Register a user via the API and return the token + user data.
 * @param {import('express').Application} app
 * @param {object} overrides - fields to merge into the default payload
 */
const registerUser = async (app, overrides = {}) => {
  const defaults = {
    name: 'Test User',
    email: `user_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    password: 'password123',
    accountType: 'user',
    bloodGroup: 'O+',
  };
  const payload = { ...defaults, ...overrides };

  const res = await request(app).post('/api/auth/register').send(payload);
  return { res, token: res.body?.data?.token, user: res.body?.data };
};

/**
 * Register a hospital user via the API.
 */
const registerHospital = async (app, overrides = {}) => {
  const defaults = {
    name: 'Test Hospital',
    email: `hospital_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    password: 'password123',
    accountType: 'hospital',
  };
  const payload = { ...defaults, ...overrides };

  const res = await request(app).post('/api/auth/register').send(payload);
  return { res, token: res.body?.data?.token, user: res.body?.data };
};

/**
 * Create an admin user directly and generate an admin JWT token.
 */
const registerAdmin = async (app, overrides = {}) => {
  const User = require('../../src/repositories/user.repository');
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../../src/middleware/auth.middleware');
  const adminUser = await User.create({
    name: 'Test Admin',
    email: `admin_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    password: 'password123',
    accountType: 'admin',
    ...overrides,
  });
  const token = jwt.sign({ id: adminUser._id, accountType: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
  return { token, user: adminUser };
};

module.exports = { registerUser, registerHospital, registerAdmin };
