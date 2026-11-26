const { isMongoConnected } = require('../config/mongo');

const sendSuccess = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, message, statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

const isDbError = (err) => {
  if (!err) return false;
  if (err.isDbError) return true;
  if (!isMongoConnected()) return true;
  if (err.statusCode && err.statusCode < 500) return false;
  const name = err.name || '';
  const msg = err.message || '';
  return (
    name === 'MongooseServerSelectionError' ||
    name === 'MongoNetworkError' ||
    name === 'MongoNetworkTimeoutError' ||
    name === 'MongoNotConnectedError' ||
    name === 'MongoServerSelectionError' ||
    name === 'MongoTopologyClosedError' ||
    msg.includes('Client must be connected') ||
    msg.includes('Topology is closed') ||
    msg.includes('buffering timed out') ||
    msg.includes('ECONNREFUSED')
  );
};

module.exports = {
  sendSuccess,
  sendError,
  isDbError,
};
