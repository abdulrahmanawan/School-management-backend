const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const verifyToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(verifyToken);

// Teacher subjects – before parameterised routes
router.get('/teacher-subjects', roleCheck('superadmin','principal','teacher'), examController.getTeacherSubjects);

router.get('/', roleCheck('superadmin','principal','teacher','exam_officer'), examController.getAll);
router.get('/:id', roleCheck('superadmin','principal','teacher','exam_officer'), examController.getById);
router.post('/', roleCheck('superadmin','teacher','exam_officer'), examController.create);
router.put('/:id', roleCheck('superadmin','exam_officer'), examController.update);
router.delete('/:id', roleCheck('superadmin'), examController.remove);

module.exports = router;