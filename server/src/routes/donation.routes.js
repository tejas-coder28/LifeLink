const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donation.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { pledgeDonationSchema } = require('../validations/donation.validation');

router.post('/pledge', protect, validate(pledgeDonationSchema), donationController.pledge);
router.get('/hospital', protect, authorize('hospital', 'admin'), donationController.getHospitalPledges);
router.post('/:id/fulfill', protect, authorize('hospital', 'admin'), donationController.complete);
router.patch('/:id/fulfill', protect, authorize('hospital', 'admin'), donationController.complete);
router.post('/:id/complete', protect, authorize('hospital', 'admin'), donationController.complete);
router.patch('/:id/complete', protect, authorize('hospital', 'admin'), donationController.complete);
router.patch('/:id/decline', protect, authorize('hospital', 'admin'), donationController.decline);
router.post('/:id/decline', protect, authorize('hospital', 'admin'), donationController.decline);
router.patch('/:id/cancel', protect, authorize('hospital', 'admin'), donationController.decline);
router.post('/:id/cancel', protect, authorize('hospital', 'admin'), donationController.decline);
router.get('/request/:requestId', protect, donationController.getByRequest);
router.get('/history', protect, donationController.getMyHistory);
router.get('/all', protect, authorize('hospital', 'admin'), donationController.getAll);

module.exports = router;
