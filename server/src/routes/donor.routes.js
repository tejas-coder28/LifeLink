const express = require('express');
const router = express.Router();
const donorController = require('../controllers/donor.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { donorProfileSchema } = require('../validations/donor.validation');

router.get('/search', donorController.searchDonors);
router.get('/badges', protect, donorController.getBadges);
router.get('/profile', protect, donorController.getProfile);
router.put('/profile', protect, validate(donorProfileSchema), donorController.updateProfile);
router.get('/all', protect, authorize('admin', 'hospital'), donorController.getAllDonors);

module.exports = router;
