const aiService = require('../services/ai.service');
const { sendSuccess, sendError, isDbError } = require('../utils/responseHandler');

const generateInsight = async (req, res, next) => {
  try {
    const { prompt } = req.body;
    const insight = await aiService.generateSystemInsight(prompt);
    return sendSuccess(res, 'AI Insight generated successfully', insight, 201);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const getInsights = async (req, res, next) => {
  try {
    const insights = await aiService.getLatestInsights();
    return sendSuccess(res, 'AI Insights history fetched', insights);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 500);
  }
};

module.exports = {
  generateInsight,
  getInsights,
};
