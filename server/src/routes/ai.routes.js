const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { protect, optionalProtect } = require('../middleware/auth.middleware');
const { aiLimiter, aiChatLimiter } = require('../middleware/rateLimiter');

// Admin insights endpoints with dedicated limiter
router.get('/insights', aiLimiter, aiController.getInsights);
router.post('/insights', aiLimiter, protect, aiController.generateInsight);

// AI Assistant chat endpoint
router.post('/chat', optionalProtect, aiChatLimiter, aiController.chat);

module.exports = router;
