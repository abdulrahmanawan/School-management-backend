const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const verifyToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(verifyToken);

router.get('/', roleCheck('owner','principal','teacher','admission_officer','accountant','librarian'), subjectController.getAll);
router.post('/', roleCheck('owner','principal'), subjectController.create);
router.put('/:id', roleCheck('owner','principal'), subjectController.update);
router.delete('/:id', roleCheck('owner','principal'), subjectController.remove);

module.exports = router;