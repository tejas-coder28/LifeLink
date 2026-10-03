const { sendError } = require('../utils/responseHandler');

const authorize = (...allowedTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401);
    }

    const type = req.user.accountType || req.user.role;
    const normalizedType = (type === 'donor' || type === 'recipient' || type === 'individual') ? 'user' : type;

    if (!allowedTypes.includes(normalizedType) && !allowedTypes.includes(type)) {
      return sendError(
        res,
        `Account type '${normalizedType}' is not authorized to access this route`,
        403
      );
    }

    next();
  };
};

const verifyHospitalOwnership = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'Not authenticated', 401);
  }

  const accountType = req.user.accountType || req.user.role;
  if (accountType === 'admin') {
    return next();
  }

  if (req.params.hospitalId && req.user.hospitalId && req.user.hospitalId.toString() !== req.params.hospitalId) {
    return sendError(res, 'Not authorized for this hospital resource', 403);
  }

  next();
};

module.exports = { authorize, verifyHospitalOwnership };
