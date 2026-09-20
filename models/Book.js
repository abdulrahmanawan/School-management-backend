const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Book = sequelize.define('Book', {
  title: { type: DataTypes.STRING, allowNull: false },
  author: { type: DataTypes.STRING, allowNull: false },
  isbn: { type: DataTypes.STRING, allowNull: false, unique: true },
  category: { type: DataTypes.STRING, defaultValue: 'General' },
  total_copies: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  available_copies: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  shelf_number: { type: DataTypes.STRING, allowNull: true },
}, {
  tableName: 'books',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at',
});

module.exports = Book;