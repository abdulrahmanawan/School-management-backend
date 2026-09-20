const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');
const verifyToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(verifyToken);

router.get('/', roleCheck('superadmin','principal','teacher','exam_officer','student'), resultController.getAll);
router.get('/pending/:exam_id', roleCheck('superadmin','teacher','exam_officer'), resultController.getPendingStudents);
router.post('/', roleCheck('superadmin','teacher','exam_officer'), resultController.createOrUpdate);
router.post('/bulk', roleCheck('superadmin','teacher','exam_officer'), resultController.bulkCreate);
router.delete('/:id', roleCheck('superadmin'), resultController.remove);

module.exports = router;