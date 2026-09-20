const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const verifyToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(verifyToken);

router.get('/', roleCheck('superadmin','principal','teacher','class_admin','student'), attendanceController.getAll);
router.get('/teacher-class', roleCheck('teacher'), attendanceController.getTeacherClass);
router.post('/', roleCheck('superadmin','teacher'), attendanceController.create);
router.post('/bulk', roleCheck('superadmin','teacher'), attendanceController.bulkCreate);
router.put('/:id', roleCheck('superadmin','teacher'), attendanceController.update);
router.delete('/:id', roleCheck('superadmin'), attendanceController.remove);

module.exports = router;