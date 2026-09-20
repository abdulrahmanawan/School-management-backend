const express = require('express');
const router = express.Router();
const communicationController = require('../controllers/communicationController');
const verifyToken = require('../middleware/auth');

router.use(verifyToken);
router.get('/messages/:userId', communicationController.getConversation);
router.post('/messages', communicationController.sendMessage);
router.get('/announcements', communicationController.getAnnouncements);
router.post('/announcements', communicationController.createAnnouncement);

module.exports = router;