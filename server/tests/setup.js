/**
 * tests/setup.js
 *
 * Jest global setup / teardown hooks shared across all test files.
 * Referenced via jest.config (setupFilesAfterFramework is not needed here;
 * each test file imports this directly via beforeAll/afterAll).
 *
 * We export a factory so every suite can share one MongoMemoryServer instance
 * connected BEFORE tests run.
 */

// Ensure tests never accidentally read the real Atlas URI
process.env.MONGODB_URI = 'memory';
// Use a dedicated JWT secret for tests so tokens don't cross-pollute
process.env.JWT_SECRET = 'lifelink_test_jwt_secret_2026';
process.env.NODE_ENV = 'test';
