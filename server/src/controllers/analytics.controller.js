const analyticsService = require('../services/analytics.service');
const { sendSuccess, sendError, isDbError } = require('../utils/responseHandler');

const getAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getSystemAnalytics();
    return sendSuccess(res, 'Analytics data fetched', data);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 500);
  }
};

module.exports = {
  getAnalytics,
};
