const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Class = sequelize.define('Class', {
  class_name: { type: DataTypes.STRING, allowNull: false },
  academic_year: DataTypes.STRING,
  room_number: DataTypes.STRING,
  capacity: DataTypes.INTEGER,
  schedule: DataTypes.TEXT,
  class_teacher_id: DataTypes.INTEGER,          // new field
}, {
  tableName: 'classes',
  timestamps: false,
});

module.exports = Class;