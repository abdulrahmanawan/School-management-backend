const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Teacher = require('./Teacher');
const Subject = require('./Subject');
const Class = require('./Class');

const TeacherSubject = sequelize.define('TeacherSubject', {
  teacher_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Teacher, key: 'id' }
  },
  subject_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Subject, key: 'id' }
  },
  class_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Class, key: 'id' }
  }
}, {
  tableName: 'teacher_subjects',
  timestamps: false,
});

module.exports = TeacherSubject;