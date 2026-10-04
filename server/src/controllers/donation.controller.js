const donationService = require('../services/donation.service');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const pledge = async (req, res) => {
  try {
    const { requestId, unitsDonated } = req.body;
    const donation = await donationService.pledgeDonation(req.user._id, requestId, unitsDonated);
    return sendSuccess(res, 'Donation pledged successfully! Thank you.', donation, 201);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const complete = async (req, res) => {
  try {
    const donation = await donationService.completeDonation(req.params.id, req.user);
    return sendSuccess(res, 'Donation marked as completed', donation);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const decline = async (req, res) => {
  try {
    const donation = await donationService.declineDonation(req.params.id, req.user);
    return sendSuccess(res, 'Donation pledge declined / marked as no-show', donation);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const getHospitalPledges = async (req, res) => {
  try {
    const pledges = await donationService.getHospitalPledges(req.user);
    return sendSuccess(res, 'Hospital pledges retrieved', pledges);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const getByRequest = async (req, res) => {
  try {
    const donations = await donationService.getDonationsByRequest(req.params.requestId);
    return sendSuccess(res, 'Donations for request retrieved', donations);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const getMyHistory = async (req, res) => {
  try {
    const history = await donationService.getUserDonationHistory(req.user._id);
    return sendSuccess(res, 'Donation history retrieved', history);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const getAll = async (req, res) => {
  try {
    const donations = await donationService.getAllDonations();
    return sendSuccess(res, 'All donations retrieved', donations);
  } catch (error) {
    return sendError(res, error.message, 400);
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
