const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Timetable = sequelize.define('Timetable', {
  class_id: { type: DataTypes.INTEGER, allowNull: false },
  day_of_week: { type: DataTypes.ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), allowNull: false },
  period_number: { type: DataTypes.INTEGER, allowNull: false },
  subject_id: { type: DataTypes.INTEGER, allowNull: false },
  teacher_id: { type: DataTypes.INTEGER, allowNull: false },
  start_time: { type: DataTypes.TIME, allowNull: false },
  end_time: { type: DataTypes.TIME, allowNull: false },
}, { tableName: 'timetables', timestamps: false });

module.exports = Timetable;