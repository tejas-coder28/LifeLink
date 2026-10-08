/**
 * tests/helpers/db.js
 *
 * In-memory database setup for Jest tests.
 * Manages clean state between test suites without touching external databases.
 */

const { memoryFirestoreInstance } = require('./inMemoryFirestore');

/**
 * Initialize test database connection. Safe to call multiple times.
 */
const connect = async () => {
  // In-memory Firestore is active automatically in NODE_ENV=test
  return memoryFirestoreInstance;
};

/**
 * Reset every collection so each test runs with a completely clean slate.
 */
const clearDatabase = async () => {
  memoryFirestoreInstance.reset();
};

/**
 * Disconnect and clean up.
 */
const disconnect = async () => {
  memoryFirestoreInstance.reset();
};

module.exports = { connect, clearDatabase, disconnect };
