const authService = require('../services/auth.service');
const { sendSuccess, sendError, isDbError } = require('../utils/responseHandler');

const register = async (req, res, next) => {
  try {
    const result = await authService.registerUser(req.body);
    return sendSuccess(res, 'Registration successful', result, 201);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 400);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.loginUser(req.body);
    return sendSuccess(res, 'Login successful', result, 200);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 401);
  }
};

const getMe = async (req, res, next) => {
  try {
    const result = await authService.getCurrentUser(req.user._id);
    return sendSuccess(res, 'User profile retrieved', result, 200);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 404);
  }
};

const googleAuth = async (req, res, next) => {
  try {
    const { idToken, bloodGroup, phone } = req.body;
    const result = await authService.loginWithGoogle({ idToken, bloodGroup, phone });
    if (result.needsProfile) {
      return res.status(200).json({
        success: true,
        needsProfile: true,
        message: 'Additional profile information required',
        data: result,
      });
    }
    return sendSuccess(res, 'Google login successful', result, 200);
  } catch (error) {
    if (isDbError(error)) return next ? next(error) : sendError(res, error.message, 500);
    return sendError(res, error.message, error.statusCode || 401);
  }
};

module.exports = {
  register,
  login,
  getMe,
  googleAuth,
};
