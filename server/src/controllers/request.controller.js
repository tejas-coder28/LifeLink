const requestService = require('../services/request.service');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const createRequest = async (req, res) => {
  try {
    const bloodRequest = await requestService.createRequest(req.user._id, req.body);
    return sendSuccess(res, 'Emergency blood request created successfully', bloodRequest, 201);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const getRequests = async (req, res) => {
  try {
    const { status, bloodGroup, requesterId, urgency } = req.query;
    const requests = await requestService.getRequests({ status, bloodGroup, requesterId, urgency });
    return sendSuccess(res, 'Blood requests fetched', requests);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const getMyRequests = async (req, res) => {
  try {
    const requests = await requestService.getRequests({ requesterId: req.user._id });
    return sendSuccess(res, 'User requests fetched', requests);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const getRequestById = async (req, res) => {
  try {
    const request = await requestService.getRequestById(req.params.id);
    return sendSuccess(res, 'Blood request details', request);
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};

const getMatches = async (req, res) => {
  try {
    const matchingService = require('../services/matching.service');
    const result = await matchingService.findMatchesForRequestId(req.params.id);
    return sendSuccess(res, 'Smart donor matches retrieved', result);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const updateStatus = async (req, res) => {
  try {
    const updatedRequest = await requestService.updateRequestStatus(req.params.id, req.body.status);
    return sendSuccess(res, 'Request status updated', updatedRequest);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

// Admin: delete a blood request (fake/spam removal)
// DELETE /api/requests/:id
const deleteRequest = async (req, res) => {
  try {
    const BloodRequest = require('../models/BloodRequest');
    const deleted = await BloodRequest.findByIdAndDelete(req.params.id);
    if (!deleted) return sendError(res, 'Blood request not found', 404);
    return sendSuccess(res, 'Blood request deleted successfully');
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

module.exports = {
  createRequest,
  getRequests,
  getMyRequests,
  getRequestById,
  getMatches,
  updateStatus,
  deleteRequest,
};
