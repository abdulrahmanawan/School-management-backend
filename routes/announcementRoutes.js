const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const verifyToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(verifyToken);

router.post('/', roleCheck('superadmin','principal','teacher'), announcementController.create);
router.get('/', announcementController.getForUser);
router.put('/:id', roleCheck('superadmin','principal','teacher'), announcementController.update);
router.delete('/:id', roleCheck('superadmin','principal','teacher'), announcementController.delete);

module.exports = router;