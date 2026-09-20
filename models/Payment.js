const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Invoice = require('./Invoice');
const Student = require('./Student');
const User = require('./User');

const Payment = sequelize.define('Payment', {
  invoice_id: { type: DataTypes.INTEGER, allowNull: false },
  student_id: { type: DataTypes.INTEGER, allowNull: false },
  amount_paid: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  payment_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  method: { type: DataTypes.ENUM('cash','easypaisa','jazzcash','bank'), allowNull: false },
  reference_no: DataTypes.STRING,
  sender_account: DataTypes.STRING,
  status: { type: DataTypes.ENUM('pending','approved','rejected'), defaultValue: 'pending' },
  submitted_by: { type: DataTypes.ENUM('student','parent'), allowNull: false, defaultValue: 'student' },
  submitted_by_user_id: DataTypes.INTEGER,
}, {
  tableName: 'payments',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at',
});

Payment.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });
Payment.belongsTo(Student, { foreignKey: 'student_id' });
Payment.belongsTo(User, { foreignKey: 'submitted_by_user_id', as: 'submittedByUser' });

module.exports = Payment;