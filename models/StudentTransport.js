const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StudentTransport = sequelize.define('StudentTransport', {
  student_id: { type: DataTypes.INTEGER, allowNull: false },
  vehicle_id: { type: DataTypes.INTEGER, allowNull: false },
  pickup_point: DataTypes.STRING,
}, { tableName: 'student_transport', timestamps: false });

module.exports = StudentTransport;