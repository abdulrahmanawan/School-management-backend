const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Book = require('./Book');
const Student = require('./Student');
const Teacher = require('./Teacher');

const BookIssue = sequelize.define('BookIssue', {
  book_id: { type: DataTypes.INTEGER, allowNull: false },
  borrower_id: { type: DataTypes.INTEGER, allowNull: false },
  borrower_type: { type: DataTypes.ENUM('student', 'teacher'), allowNull: false, defaultValue: 'student' },
  issue_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  due_date: { type: DataTypes.DATEONLY, allowNull: false },
  return_date: { type: DataTypes.DATEONLY, allowNull: true },
  fine: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('issued', 'returned'), defaultValue: 'issued' },
  return_requested: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'book_issues',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at',
});

module.exports = BookIssue;