const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Class = require('./Class');

const FeeStructure = sequelize.define('FeeStructure', {
  class_id: { type: DataTypes.INTEGER, allowNull: false },
  // No total amount stored – calculated from items
}, {
  tableName: 'fee_structures',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at',
});

FeeStructure.belongsTo(Class, { foreignKey: 'class_id' });

module.exports = FeeStructure;