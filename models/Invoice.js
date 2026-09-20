const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Student = require('./Student');
const Class = require('./Class');

const Invoice = sequelize.define('Invoice', {
  invoice_number: { type: DataTypes.STRING, allowNull: false, unique: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false },
  class_id: { type: DataTypes.INTEGER, allowNull: false },
  issue_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  due_date: DataTypes.DATEONLY,
  month: { type: DataTypes.STRING },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: { type: DataTypes.ENUM('pending','partial','paid','overdue'), defaultValue: 'pending' },
  description: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, {
  tableName: 'invoices',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at',
});

Invoice.belongsTo(Student, { foreignKey: 'student_id' });
Invoice.belongsTo(Class, { foreignKey: 'class_id' });

module.exports = Invoice;