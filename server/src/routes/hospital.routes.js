const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospital.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { updateInventorySchema } = require('../validations/hospital.validation');

router.get('/all', hospitalController.getAllHospitals);
router.get('/profile', protect, authorize('hospital', 'admin'), hospitalController.getProfile);
router.put('/inventory', protect, authorize('hospital', 'admin'), validate(updateInventorySchema), hospitalController.updateInventory);

// Admin-only: approve / reject a hospital  →  PATCH /api/hospitals/:id/verify
router.patch('/:id/verify', protect, authorize('admin'), hospitalController.verifyHospital);

// Admin-only: delete a hospital record  →  DELETE /api/hospitals/:id
router.delete('/:id', protect, authorize('admin'), hospitalController.deleteHospitalAdmin);

module.exports = router;
