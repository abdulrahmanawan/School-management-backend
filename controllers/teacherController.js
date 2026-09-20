const { Op } = require('sequelize');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const TeacherSubject = require('../models/TeacherSubject');
const User = require('../models/User');
const Timetable = require('../models/Timetable');

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', subject: subjectFilter, class_id: classFilter } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { subject: { [Op.like]: `%${search}%` } },
      ];
    }

    const subjectInclude = { model: Subject, as: 'subjects', through: { attributes: [] } };

    if (classFilter) {
      const teacherIds = await TeacherSubject.findAll({
        attributes: ['teacher_id'],
        where: { class_id: classFilter },
        group: ['teacher_id'],
      }).then(rows => rows.map(r => r.teacher_id));

      where.id = { [Op.in]: teacherIds.length > 0 ? teacherIds : [null] };
    }

    if (subjectFilter && !classFilter) {
      subjectInclude.where = { id: subjectFilter };
    }

    const { count, rows } = await Teacher.findAndCountAll({
      where,
      include: [subjectInclude],
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [['id', 'DESC']],
      distinct: true,
    });

    res.json({ teachers: rows, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const teacher = await Teacher.findByPk(req.params.id, {
      include: [{ model: Subject, as: 'subjects', through: { attributes: [] } }],
    });
    if (!teacher) return res.status(404).json({ message: 'Not found' });
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { subject_ids, password, ...teacherData } = req.body;
    const teacher = await Teacher.create(teacherData);

    if (teacherData.email) {
      const plainPassword = password || require('crypto').randomBytes(6).toString('hex');
      const hashedPassword = await require('bcryptjs').hash(plainPassword, 10);
      await User.findOrCreate({
        where: { email: teacherData.email },
        defaults: { name: teacherData.name, password: hashedPassword, role: 'teacher' },
      });
    }

    if (subject_ids && Array.isArray(subject_ids)) {
      const teacherSubjects = subject_ids.map(subject_id => ({
        teacher_id: teacher.id,
        subject_id,
      }));
      await TeacherSubject.bulkCreate(teacherSubjects);
    }

    const result = await Teacher.findByPk(teacher.id, {
      include: [{ model: Subject, as: 'subjects', through: { attributes: [] } }],
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: 'Invalid data', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { subject_ids, ...teacherData } = req.body;
    const teacher = await Teacher.findByPk(req.params.id);
    if (!teacher) return res.status(404).json({ message: 'Not found' });
    await teacher.update(teacherData);

    if (subject_ids && Array.isArray(subject_ids)) {
      await TeacherSubject.destroy({ where: { teacher_id: teacher.id } });
      const teacherSubjects = subject_ids.map(subject_id => ({
        teacher_id: teacher.id,
        subject_id,
      }));
      await TeacherSubject.bulkCreate(teacherSubjects);
    }

    const result = await Teacher.findByPk(teacher.id, {
      include: [{ model: Subject, as: 'subjects', through: { attributes: [] } }],
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: 'Update failed', error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const teacher = await Teacher.findByPk(req.params.id);
    if (!teacher) return res.status(404).json({ message: 'Not found' });
    await teacher.destroy();
    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ message: 'Delete failed', error: error.message });
  }
};

// New: get teachers available for a specific period and day(s)
exports.getAvailableForPeriod = async (req, res) => {
  try {
    const { days, period, exclude_entry_id } = req.query;
    if (!days || !period) return res.status(400).json({ message: 'days and period are required' });

    const dayList = days.split(',');
    const periodNumber = parseInt(period);

    // Find teachers already booked on any of the selected days for this period
    const conflicts = await Timetable.findAll({
      attributes: ['teacher_id'],
      where: {
        day_of_week: { [Op.in]: dayList },
        period_number: periodNumber,
      },
    });
    let bookedTeacherIds = conflicts.map(c => c.teacher_id);

    // If editing, allow the current teacher to remain
    if (exclude_entry_id) {
      const currentEntry = await Timetable.findByPk(exclude_entry_id, { attributes: ['teacher_id'] });
      if (currentEntry) {
        bookedTeacherIds = bookedTeacherIds.filter(id => id !== currentEntry.teacher_id);
      }
    }

    const availableTeachers = await Teacher.findAll({
      where: { id: { [Op.notIn]: bookedTeacherIds.length > 0 ? bookedTeacherIds : [0] } },
      order: [['name', 'ASC']],
    });

    res.json(availableTeachers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};