const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Student = sequelize.define('Student', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: true },   // ✅ nullable (some students may not have email)
  phone: DataTypes.STRING,
  dob: DataTypes.DATEONLY,
  gender: DataTypes.STRING,
  address: DataTypes.TEXT,
  class: DataTypes.STRING,
  roll_no: DataTypes.STRING,
  parent_name: DataTypes.STRING,
  parent_phone: DataTypes.STRING,
  parent_email: DataTypes.STRING,   // ✅ already exists
  admission_date: DataTypes.DATEONLY,
  sibling_group_id: DataTypes.INTEGER,
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'students',
  timestamps: false,   // ✅ disable timestamps to avoid `created_at` error
});

module.exports = Student;