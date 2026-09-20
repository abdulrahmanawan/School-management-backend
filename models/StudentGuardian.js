const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StudentGuardian = sequelize.define('StudentGuardian', {
  student_id: { type: DataTypes.INTEGER, allowNull: false },
  guardian_id: { type: DataTypes.INTEGER, allowNull: false },
  is_primary: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'student_guardians',
  timestamps: false,
});

module.exports = StudentGuardian;