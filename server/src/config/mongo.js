const mongoose = require('mongoose');

let activeDbName = '';

/**
 * Masks credentials in a MongoDB connection URI before any diagnostic message.
 */
function sanitizeUri(uri) {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
}

/**
 * Extracts a database name from URI or MONGODB_DB_NAME without exposing secrets.
 */
function resolveDbName(uri, explicitDbName) {
  if (explicitDbName && explicitDbName.trim()) {
    return explicitDbName.trim();
  }
  if (uri && typeof uri === 'string') {
    const match = uri.match(/\/([^/?]+)(?:\?|$)/);
    if (match && match[1] && !match[1].includes(':')) {
      return match[1];
    }
  }
  return 'lifelink';
}

/**
 * Connects Mongoose to MongoDB (Atlas, local replica set, or test MongoMemoryReplSet).
 * Logs exactly one startup line: "Database: MongoDB (<db name>)".
 */
async function connectMongo(uriOverride = null, options = {}) {
  const uri = uriOverride || process.env.MONGODB_URI;
  if (!uri) {
    const err = new Error('MONGODB_URI environment variable is not configured.');
    err.statusCode = 503;
    throw err;
  }

  const dbName = resolveDbName(uri, options.dbName || process.env.MONGODB_DB_NAME);

  if (mongoose.connection.readyState === 1) {
    activeDbName = mongoose.connection.name || dbName;
    return mongoose.connection;
  }

  const connectOpts = {
    dbName,
    serverSelectionTimeoutMS: options.serverSelectionTimeoutMS || 5000,
    connectTimeoutMS: options.connectTimeoutMS || 10000,
    socketTimeoutMS: options.socketTimeoutMS || 45000,
    maxPoolSize: options.maxPoolSize || 10,
  };

  try {
    await mongoose.connect(uri, connectOpts);
    activeDbName = mongoose.connection.name || dbName;
    if (process.env.NODE_ENV !== 'test' || options.logInTest) {
      console.log(`Database: MongoDB (${activeDbName})`);
    }
    return mongoose.connection;
  } catch (err) {
    const safeMsg = err.message ? err.message.replace(uri, sanitizeUri(uri)) : 'MongoDB connection failed';
    const wrapped = new Error(`MongoDB connection error (${dbName}): ${safeMsg}`);
    wrapped.statusCode = 503;
    wrapped.isDbError = true;
    throw wrapped;
  }
}

async function disconnectMongo() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  activeDbName = '';
}

function getConnection() {
  return mongoose.connection;
}

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

function getDbName() {
  return mongoose.connection?.name || activeDbName || process.env.MONGODB_DB_NAME || 'lifelink';
}

/**
 * Executes an async callback inside a MongoDB multi-document transaction session.
 * Automatically commits on success and aborts/rolls back on any error.
 */
async function withTransaction(fn) {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = {
  connectMongo,
  disconnectMongo,
  getConnection,
  isMongoConnected,
  getDbName,
  resolveDbName,
  withTransaction,
};
