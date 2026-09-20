const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Message = sequelize.define('Message', {
  sender_id: { type: DataTypes.INTEGER, allowNull: false },
  receiver_id: { type: DataTypes.INTEGER, allowNull: false },
  message: DataTypes.TEXT,
}, { tableName: 'messages', timestamps: true, updatedAt: false });

module.exports = Message;