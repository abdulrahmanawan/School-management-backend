const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Setting = sequelize.define('Setting', {
  setting_key: { type: DataTypes.STRING, primaryKey: true },
  setting_value: DataTypes.TEXT,
}, { tableName: 'settings', timestamps: false });

module.exports = Setting;