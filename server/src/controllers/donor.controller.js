const donorService = require('../services/donor.service');
const donorBadgeService = require('../services/donorBadge.service');
const { sendSuccess, sendError, isDbError } = require('../utils/responseHandler');

const getBadges = async (req, res, next) => {
  try {
    const badges = await donorBadgeService.getAllDonorBadges(req.user._id);
    return sendSuccess(res, 'Donor badges fetched successfully', badges);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const profile = await donorService.getProfileByUserId(req.user._id);
    return sendSuccess(res, 'Donor profile fetched', profile);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const profile = await donorService.updateProfileByUserId(req.user._id, req.body);
    return sendSuccess(res, 'Donor profile updated successfully', profile);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const searchDonors = async (req, res, next) => {
  try {
    const { bloodGroup, lat, lng, radiusKm, availableOnly } = req.query;
    const donors = await donorService.searchDonors({
      bloodGroup,
      lat,
      lng,
      radiusKm: radiusKm ? parseFloat(radiusKm) : 50,
      availableOnly: availableOnly !== 'false',
    });
    return sendSuccess(res, 'Donors search results', donors);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const getAllDonors = async (req, res, next) => {
  try {
    const donors = await donorService.getAllDonors();
    return sendSuccess(res, 'All donors list', donors);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  searchDonors,
  getAllDonors,
  getBadges,
};
