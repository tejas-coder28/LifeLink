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

module.exports = { registerUser, registerHospital };
