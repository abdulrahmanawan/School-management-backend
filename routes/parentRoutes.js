const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const verifyToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(verifyToken);
router.use(roleCheck('parent'));

router.get('/child', parentController.getChild);
router.get('/child/attendance', parentController.getChildAttendance);
router.get('/child/results', parentController.getChildResults);
router.get('/child/assignments', parentController.getChildAssignments);
router.get('/child/finance', parentController.getChildFinance);

module.exports = router;