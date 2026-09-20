const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AssignmentQuestion = sequelize.define('AssignmentQuestion', {
  assignment_id: { type: DataTypes.INTEGER, allowNull: false },
  question_text: { type: DataTypes.TEXT, allowNull: false },
  marks: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  order: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'assignment_questions',
  timestamps: false,
});

module.exports = AssignmentQuestion;