const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StudentExamAttempt = sequelize.define('StudentExamAttempt', {
  exam_id: { type: DataTypes.INTEGER, allowNull: false },
  student_id: { type: DataTypes.INTEGER, allowNull: false },
  question_id: { type: DataTypes.INTEGER, allowNull: false },
  selected_option: DataTypes.TINYINT,
  answer_text: DataTypes.TEXT,
}, { tableName: 'student_exam_attempts', timestamps: false });

module.exports = StudentExamAttempt;