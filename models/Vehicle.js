const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Vehicle = sequelize.define('Vehicle', {
  vehicle_number: { type: DataTypes.STRING, allowNull: false },
  driver_name: DataTypes.STRING,
  driver_phone: DataTypes.STRING,
  capacity: DataTypes.INTEGER,
  route_name: DataTypes.STRING,
}, { tableName: 'vehicles', timestamps: false });

module.exports = Vehicle;