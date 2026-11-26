const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { protect, optionalProtect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { aiLimiter, aiChatLimiter } = require('../middleware/rateLimiter');

// Admin insights endpoints (strictly admin-protected with dedicated limiter)
router.get('/insights', aiLimiter, protect, authorize('admin'), aiController.getInsights);
router.post('/insights', aiLimiter, protect, authorize('admin'), aiController.generateInsight);

// AI Assistant chat endpoint
router.post('/chat', optionalProtect, aiChatLimiter, aiController.chat);

module.exports = router;
