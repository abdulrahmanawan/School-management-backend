const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transportController');
const verifyToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(verifyToken);
router.get('/vehicles', roleCheck('superadmin','transport_manager'), transportController.getVehicles);
router.post('/vehicles', roleCheck('superadmin','transport_manager'), transportController.createVehicle);
router.put('/vehicles/:id', roleCheck('superadmin','transport_manager'), transportController.updateVehicle);
router.delete('/vehicles/:id', roleCheck('superadmin'), transportController.deleteVehicle);

router.get('/assignments', roleCheck('superadmin','transport_manager'), transportController.getAssignments);
router.post('/assign', roleCheck('superadmin','transport_manager'), transportController.assignStudent);
router.delete('/assignments/:id', roleCheck('superadmin','transport_manager'), transportController.removeAssignment);

module.exports = router;