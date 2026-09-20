const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AssignmentTaskSubmission = sequelize.define('AssignmentTaskSubmission', {
  submission_id: { type: DataTypes.INTEGER, allowNull: false },
  task_id: { type: DataTypes.INTEGER, allowNull: false },
  marks_obtained: DataTypes.DECIMAL(5,2),
  teacher_comment: DataTypes.TEXT,
}, { tableName: 'assignment_task_submissions', timestamps: false });

module.exports = AssignmentTaskSubmission;