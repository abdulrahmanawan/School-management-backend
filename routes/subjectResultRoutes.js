const express = require('express');
const router = express.Router();
const subjectResultController = require('../controllers/subjectResultController');
const verifyToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(verifyToken);

// Teacher / admin list all subject results
router.get('/', roleCheck('superadmin','principal','teacher'), subjectResultController.getAll);

// Teacher / admin routes for uploading results
router.get('/teacher/classes', roleCheck('superadmin','principal','teacher'), subjectResultController.getMyClasses);
router.get('/teacher/subjects/:classId', roleCheck('superadmin','principal','teacher'), subjectResultController.getMySubjectsForClass);
router.get('/students/:classId', roleCheck('superadmin','principal','teacher'), subjectResultController.getStudentsForClass);
router.post('/upload', roleCheck('superadmin','principal','teacher'), subjectResultController.uploadResults);

// Student route
router.get('/my', roleCheck('student'), subjectResultController.getMyResults);

module.exports = router;