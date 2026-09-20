const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Teacher = sequelize.define('Teacher', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: DataTypes.STRING,
  phone: DataTypes.STRING,
  subject: DataTypes.STRING,
  qualification: DataTypes.STRING,
  joining_date: DataTypes.DATEONLY,
  address: DataTypes.TEXT,
}, {
  tableName: 'teachers',
  timestamps: false,
});

module.exports = Teacher;