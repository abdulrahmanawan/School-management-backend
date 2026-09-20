const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Submission = sequelize.define('Submission', {
  assignment_id: { type: DataTypes.INTEGER, allowNull: false },
  student_id: { type: DataTypes.INTEGER, allowNull: false },
  submission_text: DataTypes.TEXT,
  file_url: DataTypes.STRING,
  grade: DataTypes.STRING(5),
  teacher_comment: DataTypes.TEXT,
}, {
  tableName: 'submissions',
  timestamps: true,
  updatedAt: false,
  createdAt: 'submitted_at',
});

module.exports = Submission;