const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Guardian = sequelize.define('Guardian', {
  name: { type: DataTypes.STRING, allowNull: false },
  relation: DataTypes.STRING,
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  address: DataTypes.TEXT,
}, {
  tableName: 'guardians',
  timestamps: false,
});

module.exports = Guardian;