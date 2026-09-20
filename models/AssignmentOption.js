const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AssignmentOption = sequelize.define('AssignmentOption', {
  question_id: { type: DataTypes.INTEGER, allowNull: false },
  option_text: { type: DataTypes.STRING, allowNull: false },
  is_correct: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'assignment_options',
  timestamps: false,
});

module.exports = AssignmentOption;