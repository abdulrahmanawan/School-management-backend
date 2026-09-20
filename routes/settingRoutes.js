const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const verifyToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(verifyToken);

router.get('/', settingController.getAll);
router.put('/', roleCheck('superadmin'), settingController.update);

module.exports = router;