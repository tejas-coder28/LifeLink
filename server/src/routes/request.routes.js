const express = require('express');
const router = express.Router();
const requestController = require('../controllers/request.controller');
const { protect, optionalProtect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  createRequestSchema,
  updateStatusSchema,
  rejectRequestSchema,
  issueCompatibleSchema,
  issuePatientSchema,
} = require('../validations/request.validation');

const pingController = require('../controllers/ping.controller');

router.get('/', optionalProtect, requestController.getRequests);
router.get('/my', protect, requestController.getMyRequests);
router.get('/me', protect, requestController.getMyRequests);
router.get('/hospital/incoming', protect, authorize('hospital', 'admin'), requestController.getIncomingRequests);
router.get('/:id', optionalProtect, requestController.getRequestById);
router.get('/:id/matches', requestController.getMatches);
router.get('/:requestId/pings', protect, pingController.getRequestPings);
router.post('/:requestId/notify/:donorId', protect, pingController.notifyDonor);
router.post('/', protect, validate(createRequestSchema), requestController.createRequest);
router.patch('/:id/status', protect, validate(updateStatusSchema), requestController.updateStatus);

// Hospital review and inventory fulfillment routes
router.patch('/:id/accept', protect, authorize('hospital', 'admin'), requestController.acceptRequest);
router.patch('/:id/reject', protect, authorize('hospital', 'admin'), validate(rejectRequestSchema), requestController.rejectRequest);
router.post('/:id/issue-compatible', protect, authorize('hospital', 'admin'), validate(issueCompatibleSchema), requestController.issueCompatibleUnits);
router.post('/:id/issue-patient', protect, authorize('hospital', 'admin'), validate(issuePatientSchema), requestController.issuePatientUnits);

// Admin-only: delete a fake or spam blood request  →  DELETE /api/requests/:id
router.delete('/:id', protect, authorize('admin'), requestController.deleteRequest);

module.exports = router;

