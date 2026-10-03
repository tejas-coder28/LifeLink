const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donation.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.post('/pledge', protect, donationController.pledge);
router.patch('/:id/complete', protect, donationController.complete);
router.get('/request/:requestId', protect, donationController.getByRequest);
router.get('/history', protect, donationController.getMyHistory);
router.get('/all', protect, authorize('hospital', 'admin'), donationController.getAll);

module.exports = router;
