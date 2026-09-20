const express = require('express');
const router = express.Router();
const admissionController = require('../controllers/admissionController');
const verifyToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(verifyToken);

router.get('/', roleCheck('superadmin','admission_officer','principal'), admissionController.getAll);
router.get('/:id', roleCheck('superadmin','admission_officer','principal'), admissionController.getById);
router.post('/', roleCheck('superadmin','admission_officer'), admissionController.create);
router.put('/:id', roleCheck('superadmin','admission_officer'), admissionController.update);
router.delete('/:id', roleCheck('superadmin'), admissionController.remove);
router.put('/:id/approve', roleCheck('superadmin','admission_officer','principal'), admissionController.approve);
router.put('/:id/reject', roleCheck('superadmin','admission_officer','principal'), admissionController.reject);

module.exports = router;