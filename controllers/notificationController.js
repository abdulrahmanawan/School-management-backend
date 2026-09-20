const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitToUser, emitToRole } = require('../socket');
const { computeModuleCountsForUser } = require('../moduleCounts');

// Helper to send notification to a specific user
async function sendNotificationToUser(userId, message) {
  try {
    const notification = await Notification.create({
      user_id: userId,
      message,
      is_read: false,
    });
    emitToUser(userId, 'notification', notification);
    return notification;
  } catch (err) {
    console.error('Notification create error:', err);
  }
}

// Helper to send notification to all users of a role
async function sendNotificationToRole(role, message) {
  try {
    const users = await User.findAll({ where: { role }, attributes: ['id'] });
    await Promise.all(users.map(user => sendNotificationToUser(user.id, message)));
  } catch (err) {
    console.error('Role notification error:', err);
  }
}

exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.userId },
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { user_id: req.user.userId, is_read: false } }
    );
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ New: get module counts for current user
exports.getModuleCounts = async (req, res) => {
  try {
    const counts = await computeModuleCountsForUser(req.user.userId);
    res.json(counts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.sendNotificationToUser = sendNotificationToUser;
exports.sendNotificationToRole = sendNotificationToRole;