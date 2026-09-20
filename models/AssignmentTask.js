const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AssignmentTask = sequelize.define('AssignmentTask', {
  assignment_id: { type: DataTypes.INTEGER, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  marks: { type: DataTypes.DECIMAL(5,2), defaultValue: 10 },
}, { tableName: 'assignment_tasks', timestamps: false });

module.exports = AssignmentTask;