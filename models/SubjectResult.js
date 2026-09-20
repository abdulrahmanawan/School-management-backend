const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Student = require('./Student');
const Subject = require('./Subject');
const Teacher = require('./Teacher');

const SubjectResult = sequelize.define('SubjectResult', {
  student_id: { type: DataTypes.INTEGER, allowNull: false },
  subject_id: { type: DataTypes.INTEGER, allowNull: false },
  class_id: { type: DataTypes.INTEGER, allowNull: false },
  marks_obtained: { type: DataTypes.DECIMAL(5,2), allowNull: false },
  total_marks: { type: DataTypes.DECIMAL(5,2), allowNull: false },
  grade: { type: DataTypes.STRING(5) },
  passing_marks: { type: DataTypes.DECIMAL(5,2), allowNull: true },
  teacher_id: { type: DataTypes.INTEGER, allowNull: true },   // ✅ now nullable
}, {
  tableName: 'subject_results',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at',
});

SubjectResult.belongsTo(Student, { foreignKey: 'student_id' });
SubjectResult.belongsTo(Subject, { foreignKey: 'subject_id' });
SubjectResult.belongsTo(Teacher, { foreignKey: 'teacher_id' });

module.exports = SubjectResult;