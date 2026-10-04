const hospitalService = require('../services/hospital.service');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const getProfile = async (req, res) => {
  try {
    const hospital = await hospitalService.getHospitalByUserId(req.user._id);
    return sendSuccess(res, 'Hospital profile fetched', hospital);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const updateInventory = async (req, res) => {
  try {
    const hospital = await hospitalService.updateInventoryByUserId(req.user._id, req.body.inventory);
    return sendSuccess(res, 'Inventory updated successfully', hospital);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const getAllHospitals = async (req, res) => {
  try {
    const hospitals = await hospitalService.getAllHospitals();
    return sendSuccess(res, 'All hospitals fetched', hospitals);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const getVerifiedHospitals = async (req, res) => {
  try {
    const hospitals = await hospitalService.getVerifiedHospitals();
    return sendSuccess(res, 'Verified hospitals fetched', hospitals);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

const getInventoryTransactions = async (req, res) => {
  try {
    const hospital = await hospitalService.getHospitalByUserId(req.user._id);
    const transactions = await hospitalService.getInventoryTransactions(hospital._id);
    return sendSuccess(res, 'Inventory transactions fetched', transactions);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
};

// Admin: approve or reject a hospital
// PATCH /api/hospitals/:id/verify   body: { isVerified: true|false }
const verifyHospital = async (req, res) => {
  try {
    const { isVerified } = req.body;
    if (typeof isVerified !== 'boolean') {
      return sendError(res, 'isVerified must be a boolean', 400);
    }
    const hospital = await hospitalService.setHospitalVerification(req.params.id, isVerified);
    const msg = isVerified ? 'Hospital approved and verified' : 'Hospital verification revoked';
    return sendSuccess(res, msg, hospital);
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};

// Admin: delete a hospital record
// DELETE /api/hospitals/:id
const deleteHospitalAdmin = async (req, res) => {
  try {
    await hospitalService.deleteHospital(req.params.id);
    return sendSuccess(res, 'Hospital record deleted');
  } catch (error) {
    return sendError(res, error.message, 404);
  }
};

module.exports = {
  getProfile,
  updateInventory,
  getAllHospitals,
  getVerifiedHospitals,
  getInventoryTransactions,
  verifyHospital,
  deleteHospitalAdmin,
};

