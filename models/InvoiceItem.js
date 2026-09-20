const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Invoice = require('./Invoice');

const InvoiceItem = sequelize.define('InvoiceItem', {
  invoice_id: { type: DataTypes.INTEGER, allowNull: false },
  fee_type: { type: DataTypes.STRING, allowNull: false },   // description like "Mathematics" / "Exam Fee"
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
}, {
  tableName: 'invoice_items',
  timestamps: false,
});

InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

module.exports = InvoiceItem;