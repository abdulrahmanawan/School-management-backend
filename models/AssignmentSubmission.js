const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AssignmentSubmission = sequelize.define('AssignmentSubmission', {
  assignment_id: { type: DataTypes.INTEGER, allowNull: false },
  student_id: { type: DataTypes.INTEGER, allowNull: false },
  submitted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  total_obtained_marks: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.ENUM('submitted','graded'), defaultValue: 'submitted' },
}, {
  tableName: 'assignment_submissions',
  timestamps: false,
});

module.exports = AssignmentSubmission;