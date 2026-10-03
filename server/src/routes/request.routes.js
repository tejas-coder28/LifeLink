const express = require('express');
const router = express.Router();
const requestController = require('../controllers/request.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createRequestSchema, updateStatusSchema } = require('../validations/request.validation');

const pingController = require('../controllers/ping.controller');

router.get('/', requestController.getRequests);
router.get('/my', protect, requestController.getMyRequests);
router.get('/:id', requestController.getRequestById);
router.get('/:id/matches', requestController.getMatches);
router.get('/:requestId/pings', protect, pingController.getRequestPings);
router.post('/:requestId/notify/:donorId', protect, pingController.notifyDonor);
router.post('/', protect, validate(createRequestSchema), requestController.createRequest);
router.patch('/:id/status', protect, validate(updateStatusSchema), requestController.updateStatus);

// Admin-only: delete a fake or spam blood request  →  DELETE /api/requests/:id
router.delete('/:id', protect, authorize('admin'), requestController.deleteRequest);

module.exports = router;
