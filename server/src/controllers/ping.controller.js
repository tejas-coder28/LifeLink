const pingService = require('../services/ping.service');
const { sendSuccess, sendError, isDbError } = require('../utils/responseHandler');

const notifyDonor = async (req, res, next) => {
  try {
    const { requestId, donorId } = req.params;
    const ping = await pingService.notifyDonor(requestId, donorId, req.user._id);
    return sendSuccess(res, 'Donor notified successfully via in-app ping', ping, 201);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const respondToPing = async (req, res, next) => {
  try {
    const { pingId } = req.params;
    const { decision } = req.body;
    const updatedPing = await pingService.respondToPing(pingId, req.user._id, decision);
    return sendSuccess(res, `Ping response recorded: ${decision}`, updatedPing);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const getRequestPings = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const pings = await pingService.getRequestPings(requestId);
    return sendSuccess(res, 'Request pings retrieved', pings);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const getPendingPings = async (req, res, next) => {
  try {
    const pings = await pingService.getPendingPingsForDonor(req.user._id);
    return sendSuccess(res, 'Pending donor pings retrieved', pings);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

module.exports = {
  notifyDonor,
  respondToPing,
  getRequestPings,
  getPendingPings,
};
