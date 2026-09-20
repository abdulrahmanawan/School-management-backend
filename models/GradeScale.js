const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const GradeScale = sequelize.define('GradeScale', {
  min_percentage: { type: DataTypes.DECIMAL(5,2), allowNull: false },
  max_percentage: { type: DataTypes.DECIMAL(5,2), allowNull: false },
  grade: { type: DataTypes.STRING(5), allowNull: false },
  gpa: { type: DataTypes.DECIMAL(3,1), allowNull: false },
}, {
  tableName: 'grade_scale',
  timestamps: false,
});

module.exports = GradeScale;