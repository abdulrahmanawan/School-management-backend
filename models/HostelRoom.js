const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const HostelRoom = sequelize.define('HostelRoom', {
  room_number: { type: DataTypes.STRING, allowNull: false },
  capacity: { type: DataTypes.INTEGER, defaultValue: 1 },
  current_occupancy: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'hostel_rooms', timestamps: false });

module.exports = HostelRoom;