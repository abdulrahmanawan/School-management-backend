const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const FeeStructure = require('./FeeStructure');
const Subject = require('./Subject');

const FeeStructureItem = sequelize.define('FeeStructureItem', {
  fee_structure_id: { type: DataTypes.INTEGER, allowNull: false },
  item_type: { type: DataTypes.ENUM('subject', 'custom'), allowNull: false },
  subject_id: { type: DataTypes.INTEGER, allowNull: true },    // for subject type
  description: { type: DataTypes.STRING, allowNull: false },   // e.g. "Mathematics", "Exam Fee"
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
}, {
  tableName: 'fee_structure_items',
  timestamps: false,
});

FeeStructureItem.belongsTo(FeeStructure, { foreignKey: 'fee_structure_id' });
FeeStructureItem.belongsTo(Subject, { foreignKey: 'subject_id' });

module.exports = FeeStructureItem;