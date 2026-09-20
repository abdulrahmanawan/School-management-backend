const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Section = sequelize.define('Section', {
  class_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  class_teacher_id: DataTypes.INTEGER,
}, {
  tableName: 'sections',
  timestamps: false,
});

module.exports = Section;