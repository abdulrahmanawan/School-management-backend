const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FinanceSetting = sequelize.define('FinanceSetting', {
  setting_key: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
  setting_value: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: 'finance_settings',
  timestamps: false,
});

module.exports = FinanceSetting;