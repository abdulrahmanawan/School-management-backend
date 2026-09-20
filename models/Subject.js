const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Subject = sequelize.define('Subject', {
  name: { type: DataTypes.STRING, allowNull: false },
  code: DataTypes.STRING,
}, {
  tableName: 'subjects',
  timestamps: false,
});

module.exports = Subject;