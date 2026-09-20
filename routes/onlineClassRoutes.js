const express = require('express');
const router = express.Router();
const onlineClassController = require('../controllers/onlineClassController');
const verifyToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(verifyToken);

// Teacher / admin routes
router.get('/teacher/classes', roleCheck('superadmin','principal','teacher'), onlineClassController.getMyClasses);
router.post('/', roleCheck('superadmin','principal','teacher'), onlineClassController.create);
router.get('/', roleCheck('superadmin','principal','teacher','student'), onlineClassController.getAll);
router.delete('/:id', roleCheck('superadmin','principal','teacher'), onlineClassController.remove);

// Student specific
router.get('/student/my-classes', roleCheck('student'), onlineClassController.getStudentClasses);

module.exports = router;