const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const verifyToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(verifyToken);

// Specific routes before parameterised ones
router.get('/my-profile', roleCheck('student'), studentController.myProfile);
router.get('/bulk-promote', roleCheck('superadmin','principal'), studentController.bulkPromote);
router.get('/attendance-summary', roleCheck('superadmin','principal','teacher','admission_officer','accountant'), studentController.attendanceSummary);
router.get('/:id/report', roleCheck('superadmin','principal','teacher','parent','student','accountant'), studentController.getReport);

// General CRUD routes
// GET / now allows accountant + librarian
router.get('/', roleCheck('superadmin','principal','teacher','admission_officer','accountant','librarian'), studentController.getAll);
router.get('/:id', roleCheck('superadmin','principal','teacher','admission_officer','student','parent','accountant'), studentController.getById);
router.post('/', roleCheck('superadmin','admission_officer'), studentController.create);
router.put('/:id', roleCheck('superadmin','principal','admission_officer'), studentController.update);
router.put('/:id/promote', roleCheck('superadmin','principal'), studentController.promote);
router.delete('/:id', roleCheck('superadmin'), studentController.remove);

module.exports = router;