const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const verifyToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(verifyToken);

router.get('/assignable', roleCheck('superadmin','principal','teacher'), assignmentController.getAssignable);
router.get('/', roleCheck('superadmin','principal','teacher','student'), assignmentController.getAll);
router.post('/', roleCheck('superadmin','principal','teacher'), assignmentController.create);
router.get('/student-count', roleCheck('student'), assignmentController.getStudentAssignments);

// My submissions (student)
router.get('/my-submissions', roleCheck('student'), assignmentController.getMySubmissions);
router.get('/submission/my/:assignmentId', roleCheck('student'), assignmentController.getMySubmission);

// Assignment detail (must come before /:id/students etc.)
router.get('/:id', roleCheck('superadmin','principal','teacher','student'), assignmentController.getOne);
router.put('/:id', roleCheck('superadmin','principal'), assignmentController.update);
router.delete('/:id', roleCheck('superadmin','principal'), assignmentController.remove);

// Students of assignment
router.get('/:id/students', roleCheck('superadmin','principal','teacher'), assignmentController.getClassStudents);
router.post('/:id/notify', roleCheck('superadmin','principal','teacher'), assignmentController.notifyUnsubmitted);

// Submissions
router.post('/:assignmentId/submit', roleCheck('student'), assignmentController.submit);
router.get('/:assignmentId/submissions', roleCheck('superadmin','principal','teacher'), assignmentController.getSubmissions);
router.get('/submission/:submissionId', roleCheck('superadmin','principal','teacher','student'), assignmentController.getSubmissionDetail);
router.put('/submission/:submissionId/grade', roleCheck('superadmin','principal','teacher'), assignmentController.gradeSubmission);

module.exports = router;