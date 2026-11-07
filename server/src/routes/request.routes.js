const express = require('express');
const router = express.Router();
const requestController = require('../controllers/request.controller');
const { protect, optionalProtect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  createRequestSchema,
  updateStatusSchema,
  editRequestSchema,
  cancelRequestSchema,
  closeRequestSchema,
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

// Edit, cancel, and close request routes
router.patch('/:id/cancel', protect, validate(cancelRequestSchema), requestController.cancelRequest);
router.post('/:id/cancel', protect, validate(cancelRequestSchema), requestController.cancelRequest);
router.patch('/:id/close', protect, validate(closeRequestSchema), requestController.closeRequest);
router.post('/:id/close', protect, validate(closeRequestSchema), requestController.closeRequest);
router.patch('/:id', protect, validate(editRequestSchema), requestController.editRequest);
router.put('/:id', protect, validate(editRequestSchema), requestController.editRequest);

// Hospital review and inventory fulfillment routes
router.patch('/:id/accept', protect, authorize('hospital', 'admin'), requestController.acceptRequest);
router.patch('/:id/reject', protect, authorize('hospital', 'admin'), validate(rejectRequestSchema), requestController.rejectRequest);
router.post('/:id/issue-compatible', protect, authorize('hospital', 'admin'), validate(issueCompatibleSchema), requestController.issueCompatibleUnits);
router.post('/:id/issue-patient', protect, authorize('hospital', 'admin'), validate(issuePatientSchema), requestController.issuePatientUnits);

// Undo-create / delete blood request:
// Allowed within 5 minutes and 0 pledges for owning hospital/requester, or anytime for admin
router.delete('/:id', protect, requestController.deleteRequest);

module.exports = router;

