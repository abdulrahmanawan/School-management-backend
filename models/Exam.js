const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Exam = sequelize.define('Exam', {
  exam_name: { type: DataTypes.STRING, allowNull: false },
  subject: { type: DataTypes.STRING },
  class_id: { type: DataTypes.INTEGER },
  date: { type: DataTypes.DATEONLY },
  total_marks: { type: DataTypes.INTEGER },
}, {
  tableName: 'exams',
  timestamps: false,
});

module.exports = Exam;