const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM('owner','principal','teacher','student','parent','accountant','librarian','admission_officer'),
    allowNull: false,
    defaultValue: 'student',
  },
}, {
  tableName: 'users',
  timestamps: false,   // ✅ disable timestamps to match existing table
});

module.exports = User;