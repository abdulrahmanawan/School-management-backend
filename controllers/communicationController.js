const Message = require('../models/Message');
const Announcement = require('../models/Announcement');
const { Op } = require('sequelize');

// Messages
exports.getConversation = async (req, res) => {
  const userId = req.user.userId; // from token
  const otherUserId = req.params.userId;
  const messages = await Message.findAll({
    where: {
      [Op.or]: [
        { sender_id: userId, receiver_id: otherUserId },
        { sender_id: otherUserId, receiver_id: userId },
      ]
    },
    order: [['created_at', 'ASC']],
    limit: 100,
  });
  res.json(messages);
};

exports.sendMessage = async (req, res) => {
  const { receiver_id, message } = req.body;
  const msg = await Message.create({
    sender_id: req.user.userId,
    receiver_id,
    message,
  });
  res.status(201).json(msg);
};

// Announcements
exports.getAnnouncements = async (req, res) => {
  const announcements = await Announcement.findAll({ order: [['created_at', 'DESC']], limit: 20 });
  res.json(announcements);
};

exports.createAnnouncement = async (req, res) => {
  const { title, message } = req.body;
  const ann = await Announcement.create({ title, message, created_by: req.user.userId });
  res.status(201).json(ann);
};