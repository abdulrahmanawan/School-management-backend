const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Announcement = sequelize.define('Announcement', {
  title: { type: DataTypes.STRING, allowNull: false },
  message: DataTypes.TEXT,
  file_url: DataTypes.STRING(500),
  created_by: { type: DataTypes.INTEGER, allowNull: false },
  target_type: { type: DataTypes.ENUM('all','class','role'), defaultValue: 'all' },
  target_ids: DataTypes.TEXT,
}, {
  tableName: 'announcements',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at',
});

module.exports = Announcement;