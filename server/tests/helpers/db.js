/**
 * tests/helpers/db.js
 *
 * In-memory MongoDB setup for Jest.
 * Uses mongodb-memory-server so tests NEVER touch the real Atlas cluster.
 * Import connect/disconnect into jest globalSetup/globalTeardown, or call
 * them directly inside beforeAll/afterAll in each test suite.
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod = null;

/**
 * Start the in-memory server and connect Mongoose to it.
 * Safe to call multiple times — subsequent calls are no-ops if already connected.
 */
const connect = async () => {
  // If already connected (e.g. from a previous test file), skip
  if (mongoose.connection.readyState === 1) return;

  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  await mongoose.connect(uri);
};

/**
 * Drop every collection so each test suite starts with a clean slate.
 * Call this in afterEach or between suite sections as appropriate.
 */
const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

/**
 * Disconnect Mongoose and shut down the in-memory server.
 * Call this in afterAll.
 */
const disconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
};

module.exports = { connect, clearDatabase, disconnect };
