const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ExamQuestion = sequelize.define('ExamQuestion', {
  exam_id: { type: DataTypes.INTEGER, allowNull: false },
  question_text: { type: DataTypes.TEXT, allowNull: false },
  marks: { type: DataTypes.DECIMAL(5,2), allowNull: false },
  type: { type: DataTypes.ENUM('mcq','qa'), defaultValue: 'qa' },
  option1: DataTypes.STRING,
  option2: DataTypes.STRING,
  option3: DataTypes.STRING,
  option4: DataTypes.STRING,
  correct_option: DataTypes.TINYINT,
}, { tableName: 'exam_questions', timestamps: false });

module.exports = ExamQuestion;