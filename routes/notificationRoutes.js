const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const verifyToken = require('../middleware/auth');

router.use(verifyToken);

router.get('/my', notificationController.getMyNotifications);
router.put('/read-all', notificationController.markAllRead);

// ✅ New: get module counts
router.get('/module-counts', notificationController.getModuleCounts);

module.exports = router;