const express = require('express');
const router = express.Router();
const hostelController = require('../controllers/hostelController');
const verifyToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(verifyToken);
router.get('/rooms', roleCheck('superadmin','hostel_manager'), hostelController.getRooms);
router.post('/rooms', roleCheck('superadmin','hostel_manager'), hostelController.createRoom);
router.put('/rooms/:id', roleCheck('superadmin','hostel_manager'), hostelController.updateRoom);
router.delete('/rooms/:id', roleCheck('superadmin'), hostelController.deleteRoom);

router.get('/assignments', roleCheck('superadmin','hostel_manager'), hostelController.getAssignments);
router.post('/assign', roleCheck('superadmin','hostel_manager'), hostelController.assignStudent);
router.delete('/assignments/:id', roleCheck('superadmin','hostel_manager'), hostelController.removeAssignment);

module.exports = router;