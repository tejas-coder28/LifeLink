const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

// Admin-only: platform stats (donor count, fulfillment rate, etc.)
router.get('/summary', protect, authorize('admin'), analyticsController.getAnalytics);

module.exports = router;
