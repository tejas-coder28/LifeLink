const donationService = require('../services/donation.service');
const { sendSuccess, sendError, isDbError } = require('../utils/responseHandler');

const pledge = async (req, res, next) => {
  try {
    const { requestId, units, unitsDonated } = req.body;
    const unitsToPledge = units !== undefined ? units : unitsDonated;
    const donation = await donationService.pledgeDonation(req.user._id, requestId, unitsToPledge);
    return sendSuccess(res, 'Donation pledged successfully! Thank you.', donation, 201);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    console.error(`[Donation Pledge Error] ${error.name || 'Error'}:`, error.message);
    return sendError(res, 'Unable to submit donation pledge. Please try again.', 500);
  }
};

const complete = async (req, res, next) => {
  try {
    const donation = await donationService.completeDonation(req.params.id, req.user);
    return sendSuccess(res, 'Donation marked as completed', donation);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    console.error(`[Donation Complete Error] ${error.name || 'Error'}:`, error.message);
    return sendError(res, 'Unable to confirm donation. Please try again.', 500);
  }
};

const decline = async (req, res, next) => {
  try {
    const donation = await donationService.declineDonation(req.params.id, req.user);
    return sendSuccess(res, 'Donation pledge declined / marked as no-show', donation);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    console.error(`[Donation Decline Error] ${error.name || 'Error'}:`, error.message);
    return sendError(res, 'Unable to decline pledge. Please try again.', 500);
  }
};

const getHospitalPledges = async (req, res, next) => {
  try {
    const pledges = await donationService.getHospitalPledges(req.user);
    return sendSuccess(res, 'Hospital pledges retrieved', pledges);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const getByRequest = async (req, res, next) => {
  try {
    const donations = await donationService.getDonationsByRequest(req.params.requestId, req.user);
    return sendSuccess(res, 'Donations for request retrieved', donations);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const getMyHistory = async (req, res, next) => {
  try {
    const history = await donationService.getUserDonationHistory(req.user._id);
    return sendSuccess(res, 'Donation history retrieved', history);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const getAll = async (req, res, next) => {
  try {
    const donations = await donationService.getAllDonations();
    return sendSuccess(res, 'All donations retrieved', donations);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

module.exports = {
  pledge,
  complete,
  decline,
  getHospitalPledges,
  getByRequest,
  getMyHistory,
  getAll,
};
