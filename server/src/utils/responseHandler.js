/**
 * Standardized API response format
 */
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
  if (err.statusCode && err.statusCode < 500) return false;
  const msg = err.message || '';
  return msg.includes('FAILED_PRECONDITION') ||
         msg.includes('requires an index') ||
         msg.includes('UNAVAILABLE') ||
         msg.includes('DEADLINE_EXCEEDED') ||
         err.code === 9 ||
         err.code === 14 ||
         err.name === 'FirebaseError';
};

module.exports = {
  sendSuccess,
  sendError,
  isDbError,
};
