const requestService = require('../services/request.service');
const { sendSuccess, sendError, isDbError } = require('../utils/responseHandler');

const createRequest = async (req, res, next) => {
  try {
    const bloodRequest = await requestService.createRequest(req.user._id, req.body);
    return sendSuccess(res, 'Emergency blood request created successfully', bloodRequest, 201);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const getRequests = async (req, res, next) => {
  try {
    const { status, bloodGroup, requesterId, urgency } = req.query;
    const requests = await requestService.getRequests({ status, bloodGroup, requesterId, urgency }, req.user);
    return sendSuccess(res, 'Blood requests fetched', requests);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const getMyRequests = async (req, res, next) => {
  try {
    const isMePath = req.path === '/me' || req.path.endsWith('/me');
    const includeAll = isMePath || req.query.scope === 'all' || req.query.all === 'true' || req.query.includeAll === 'true';
    const requests = await requestService.getMyRequests(req.user, { includeAll });
    return sendSuccess(res, 'User requests fetched', requests);
  } catch (error) {
    console.error('[RequestController] getMyRequests error:', error?.constructor?.name || 'Error', error.message);
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const getRequestById = async (req, res, next) => {
  try {
    const request = await requestService.getRequestById(req.params.id, req.user);
    return sendSuccess(res, 'Blood request details', request);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 404);
  }
};

const getMatches = async (req, res, next) => {
  try {
    const matchingService = require('../services/matching.service');
    const result = await matchingService.findMatchesForRequestId(req.params.id);
    return sendSuccess(res, 'Smart donor matches retrieved', result);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const updatedRequest = await requestService.updateRequestStatus(req.params.id, req.body.status);
    return sendSuccess(res, 'Request status updated', updatedRequest);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

// Hospital: incoming queue of requests addressed to this hospital
// GET /api/requests/hospital/incoming
const getIncomingRequests = async (req, res, next) => {
  try {
    const requests = await requestService.getIncomingHospitalRequests(req.user._id);
    return sendSuccess(res, 'Incoming hospital requests fetched', requests);
  } catch (error) {
    console.error('[RequestController] getIncomingRequests error:', error?.constructor?.name || 'Error', error.message);
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

// Hospital: accept request and check stock
// PATCH /api/requests/:id/accept
const acceptRequest = async (req, res, next) => {
  try {
    const result = await requestService.acceptRequest(req.params.id, req.user._id, req.user.accountType);
    return sendSuccess(res, 'Blood request reviewed and processed', result);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

// Hospital: reject request with reason
// PATCH /api/requests/:id/reject
const rejectRequest = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const request = await requestService.rejectRequest(req.params.id, req.user._id, req.user.accountType, reason);
    return sendSuccess(res, 'Blood request rejected', request);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

// Hospital: issue compatible units from inventory
// POST /api/requests/:id/issue-compatible
const issueCompatibleUnits = async (req, res, next) => {
  try {
    const { bloodGroup, units } = req.body;
    const request = await requestService.issueCompatibleUnits(
      req.params.id,
      req.user._id,
      req.user.accountType,
      bloodGroup,
      units
    );
    return sendSuccess(res, 'Compatible units issued successfully', request);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

// Hospital: issue confirmed/donated units to patient
// POST /api/requests/:id/issue-patient
const issuePatientUnits = async (req, res, next) => {
  try {
    const { units } = req.body;
    const request = await requestService.issuePatientUnits(
      req.params.id,
      req.user._id,
      req.user.accountType,
      units || 1
    );
    return sendSuccess(res, 'Blood units issued to patient successfully', request);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const editRequest = async (req, res, next) => {
  try {
    const updated = await requestService.editRequest(req.params.id, req.user, req.body);
    return sendSuccess(res, 'Blood request updated successfully', updated);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const cancelRequest = async (req, res, next) => {
  try {
    const result = await requestService.cancelRequest(req.params.id, req.user, req.body);
    return sendSuccess(res, result.message, result);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const closeRequest = async (req, res, next) => {
  try {
    const updated = await requestService.closeRequest(req.params.id, req.user, req.body.note);
    return sendSuccess(res, 'Blood request closed successfully', updated);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

// Undo-create / Delete request (within 5 minutes & 0 pledges for non-admins, or anytime for admin)
// DELETE /api/requests/:id
const deleteRequest = async (req, res, next) => {
  try {
    const result = await requestService.deleteRequest(req.params.id, req.user);
    return sendSuccess(res, result.message, result);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

module.exports = {
  createRequest,
  getRequests,
  getMyRequests,
  getRequestById,
  getMatches,
  updateStatus,
  getIncomingRequests,
  acceptRequest,
  rejectRequest,
  issueCompatibleUnits,
  issuePatientUnits,
  editRequest,
  cancelRequest,
  closeRequest,
  deleteRequest,
};
