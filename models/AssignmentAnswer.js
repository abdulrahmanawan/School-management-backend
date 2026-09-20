const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AssignmentAnswer = sequelize.define('AssignmentAnswer', {
  submission_id: { type: DataTypes.INTEGER, allowNull: false },
  question_id: { type: DataTypes.INTEGER, allowNull: false },
  selected_option_id: { type: DataTypes.INTEGER, allowNull: true },    // MCQ
  answer_text: { type: DataTypes.TEXT, allowNull: true },              // QA
  marks_obtained: { type: DataTypes.INTEGER, allowNull: true },        // graded (QA) or auto (MCQ)
  teacher_comment: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'assignment_answers',
  timestamps: false,
});

module.exports = AssignmentAnswer;