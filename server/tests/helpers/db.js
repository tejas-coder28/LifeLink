/**
 * tests/helpers/db.js
 *
 * Isolated MongoDB Replica-Set test database setup using mongodb-memory-server.
 * Supports multi-document transactions and enforces all Mongoose schema indexes.
 */

const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { connectDB, disconnectMongo, isMongoConnected } = require('../../src/config/db');
const models = require('../../src/models');

let replSet = null;
let indexesSynced = false;

/**
 * Initialize test MongoDB replica set connection. Safe to call multiple times.
 */
const connect = async () => {
  if (!replSet) {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  }
  const uri = replSet.getUri();
  process.env.MONGODB_URI = uri;

  if (!isMongoConnected()) {
    await connectDB(uri, { dbName: 'lifelink_test' });
    indexesSynced = false;
  }

  if (!indexesSynced) {
    await Promise.all(Object.values(models).map((M) => M.syncIndexes()));
    indexesSynced = true;
  }

  return uri;
};

/**
 * Clear every collection between tests while preserving indexes.
 */
const clearDatabase = async () => {
  if (!isMongoConnected()) return;
  await Promise.all(Object.values(models).map((M) => M.deleteMany({})));
};

/**
 * Disconnect Mongoose and stop MongoMemoryReplSet cleanly.
 */
const disconnect = async () => {
  await disconnectMongo();
  indexesSynced = false;
  if (replSet) {
    await replSet.stop();
    replSet = null;
  }
};

module.exports = { connect, clearDatabase, disconnect };
