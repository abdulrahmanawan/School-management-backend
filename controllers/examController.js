const { Op } = require('sequelize');
const Exam = require('../models/Exam');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const TeacherSubject = require('../models/TeacherSubject');

// Get all exams – optional filter by teacher_id
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', teacher_id } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (search) {
      where[Op.or] = [
        { exam_name: { [Op.like]: `%${search}%` } },
        { subject: { [Op.like]: `%${search}%` } },
      ];
    }
    if (teacher_id) where.teacher_id = teacher_id;

    const { count, rows } = await Exam.findAndCountAll({
      where,
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [['id', 'DESC']],
    });
    res.json({ exams: rows, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const exam = await Exam.findByPk(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Not found' });
    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { subject, class_id, ...rest } = req.body;

    // If teacher, verify they are allowed to create exam for this subject & class
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ where: { email: req.user.email } });
      if (!teacher) return res.status(403).json({ message: 'Teacher not found' });

      // Check teacher_subjects for this subject and class
      const allowed = await TeacherSubject.findOne({
        where: { teacher_id: teacher.id, subject_id: subject, class_id },
      });
      if (!allowed) {
        return res.status(403).json({ message: 'You are not assigned to this subject/class' });
      }
    }

    const exam = await Exam.create({ ...rest, subject, class_id });
    res.status(201).json(exam);
  } catch (error) {
    res.status(400).json({ message: 'Invalid data', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const exam = await Exam.findByPk(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Not found' });

    // Additional permission check can be added here if needed

    await exam.update(req.body);
    res.json(exam);
  } catch (error) {
    res.status(400).json({ message: 'Update failed', error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const exam = await Exam.findByPk(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Not found' });
    await exam.destroy();
    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ message: 'Delete failed', error: error.message });
  }
};

// Get teacher's allowed subjects & classes
exports.getTeacherSubjects = async (req, res) => {
  try {
    // superadmin / principal get everything
    if (['superadmin', 'principal'].includes(req.user.role)) {
      const subjects = await Subject.findAll({ order: [['name', 'ASC']] });
      const classes = await Class.findAll({ order: [['class_name', 'ASC']] });
      return res.json({ subjects, classes });
    }

    // teacher – find their assignments
    const teacher = await Teacher.findOne({ where: { email: req.user.email } });
    if (!teacher) return res.status(403).json({ message: 'Teacher record not found' });

    const teacherSubjects = await TeacherSubject.findAll({
      where: { teacher_id: teacher.id },
      include: [
        { model: Subject, attributes: ['id', 'name', 'code'] },
        { model: Class, attributes: ['id', 'class_name'] },
      ],
    });

    // Extract unique subjects and classes
    const subjectsMap = {};
    const classesMap = {};
    teacherSubjects.forEach(ts => {
      if (ts.Subject) subjectsMap[ts.Subject.id] = ts.Subject;
      if (ts.Class) classesMap[ts.Class.id] = ts.Class;
    });

    res.json({
      subjects: Object.values(subjectsMap),
      classes: Object.values(classesMap),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};