const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const HostelAssignment = sequelize.define('HostelAssignment', {
  student_id: { type: DataTypes.INTEGER, allowNull: false },
  room_id: { type: DataTypes.INTEGER, allowNull: false },
  check_in_date: DataTypes.DATEONLY,
}, {
  tableName: 'hostel_assignments',
  timestamps: false,
});

module.exports = HostelAssignment;