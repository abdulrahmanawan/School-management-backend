const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const verifyToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(verifyToken);

// Available teachers (not already class teacher)
router.get('/available-class-teachers', roleCheck('superadmin','principal','class_admin'), classController.getAvailableClassTeachers);

// Classes – GET now allows accountant + librarian
router.get('/', roleCheck('superadmin','principal','teacher','class_admin','admission_officer','accountant','librarian'), classController.getAll);
router.get('/:id', roleCheck('superadmin','principal','teacher','class_admin','accountant'), classController.getById);
router.post('/', roleCheck('superadmin','principal','class_admin'), classController.create);
router.put('/:id', roleCheck('superadmin','principal','class_admin'), classController.update);
router.delete('/:id', roleCheck('superadmin'), classController.remove);

// Sections
router.get('/:classId/sections', roleCheck('superadmin','principal','teacher','accountant'), classController.getSections);
router.post('/:classId/sections', roleCheck('superadmin','principal'), classController.createSection);
router.put('/:classId/sections/:sectionId', roleCheck('superadmin','principal'), classController.updateSection);
router.delete('/:classId/sections/:sectionId', roleCheck('superadmin'), classController.removeSection);

// Timetable
router.get('/:classId/timetable', roleCheck('superadmin','principal','teacher','student','parent','accountant'), classController.getTimetable);
router.post('/:classId/timetable', roleCheck('superadmin','principal','class_admin'), classController.createTimetableEntry);
router.put('/:classId/timetable/:entryId', roleCheck('superadmin','principal','class_admin'), classController.updateTimetableEntry);
router.delete('/:classId/timetable/:entryId', roleCheck('superadmin','principal','class_admin'), classController.deleteTimetableEntry);

module.exports = router;