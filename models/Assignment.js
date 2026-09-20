const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Assignment = sequelize.define('Assignment', {
  title: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  class_id: { type: DataTypes.INTEGER, allowNull: false },
  teacher_id: { type: DataTypes.INTEGER, allowNull: true },
  subject_id: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.ENUM('mcq','qa'), allowNull: false },
  due_date: DataTypes.DATEONLY,
  total_marks: { type: DataTypes.INTEGER, defaultValue: 0 },
  passing_marks: { type: DataTypes.INTEGER, allowNull: true },  // NEW
}, {
  tableName: 'assignments',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at',
});

module.exports = Assignment;