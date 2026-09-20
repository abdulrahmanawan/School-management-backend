const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Admission = sequelize.define('Admission', {
  student_name: { type: DataTypes.STRING, allowNull: false },
  email: DataTypes.STRING,
  phone: DataTypes.STRING,
  dob: DataTypes.DATEONLY,
  gender: DataTypes.STRING,
  address: DataTypes.TEXT,
  desired_class: DataTypes.STRING,
  parent_name: DataTypes.STRING,
  parent_phone: DataTypes.STRING,
  parent_email: DataTypes.STRING,        // ✅ new
  parent_password: DataTypes.STRING,     // ✅ new (plain text from form)
  previous_school: DataTypes.STRING,
  status: { type: DataTypes.ENUM('pending','approved','rejected'), defaultValue: 'pending' },
  applied_date: DataTypes.DATEONLY,
  notes: DataTypes.TEXT,
  password: DataTypes.STRING,            // student password
}, {
  tableName: 'admissions',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at',
});

module.exports = Admission;