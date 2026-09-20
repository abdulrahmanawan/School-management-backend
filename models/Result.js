const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Result = sequelize.define('Result', {
  exam_id: { type: DataTypes.INTEGER },
  student_id: { type: DataTypes.INTEGER },
  marks_obtained: { type: DataTypes.DECIMAL(5,2) },
  grade: { type: DataTypes.STRING(5) },
}, {
  tableName: 'results',
  timestamps: false,
});

module.exports = Result;