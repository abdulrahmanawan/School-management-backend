const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const verifyToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(verifyToken);

// Existing routes
router.get('/', roleCheck('superadmin', 'principal', 'teacher', 'hr_officer'), teacherController.getAll);
router.get('/:id', roleCheck('superadmin', 'principal', 'teacher', 'hr_officer'), teacherController.getById);
router.post('/', roleCheck('superadmin', 'hr_officer'), teacherController.create);
router.put('/:id', roleCheck('superadmin', 'hr_officer'), teacherController.update);
router.delete('/:id', roleCheck('superadmin'), teacherController.remove);

// New route for timetable availability
router.get('/available-for-period', roleCheck('superadmin', 'principal', 'teacher'), teacherController.getAvailableForPeriod);

module.exports = router;