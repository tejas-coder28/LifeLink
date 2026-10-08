/**
 * tests/setup.js
 *
 * Jest global setup environment configuration shared across all test files.
 */

// Use a dedicated JWT secret for tests so tokens don't cross-pollute
process.env.JWT_SECRET = 'lifelink_test_jwt_secret_2026';
process.env.NODE_ENV = 'test';
process.env.FIREBASE_PROJECT_ID = 'lifelink-test-memory';
