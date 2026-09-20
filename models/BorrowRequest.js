const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Book = require('./Book');
const Student = require('./Student');
const Teacher = require('./Teacher');

const BorrowRequest = sequelize.define('BorrowRequest', {
  book_id: { type: DataTypes.INTEGER, allowNull: false },
  borrower_id: { type: DataTypes.INTEGER, allowNull: false },
  borrower_type: { type: DataTypes.ENUM('student', 'teacher'), allowNull: false, defaultValue: 'student' },
  request_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled', 'issued'),
    defaultValue: 'pending',
  },
  processed_by: { type: DataTypes.INTEGER },
}, {
  tableName: 'borrow_requests',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at',
});

module.exports = BorrowRequest;