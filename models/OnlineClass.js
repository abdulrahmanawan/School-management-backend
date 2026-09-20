const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const OnlineClass = sequelize.define('OnlineClass', {
  title: { type: DataTypes.STRING, allowNull: false },
  class_id: { type: DataTypes.INTEGER, allowNull: true },
  teacher_id: { type: DataTypes.INTEGER, allowNull: true },
  meeting_type: {
    type: DataTypes.ENUM('class', 'staff'),
    defaultValue: 'class',
    allowNull: false,
  },
  scheduled_date: { type: DataTypes.DATEONLY, allowNull: false },
  start_time: { type: DataTypes.STRING, allowNull: false },
  end_time: { type: DataTypes.STRING, allowNull: false },
  meet_link: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  invited_staff: { type: DataTypes.TEXT, allowNull: true }, // 'all' or comma-separated teacher IDs
}, {
  tableName: 'online_classes',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at',
});

module.exports = OnlineClass;