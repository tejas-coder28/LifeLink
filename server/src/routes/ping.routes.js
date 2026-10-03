const express = require('express');
const router = express.Router();
const pingController = require('../controllers/ping.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/pending', protect, pingController.getPendingPings);
router.patch('/:pingId/respond', protect, pingController.respondToPing);

module.exports = router;
