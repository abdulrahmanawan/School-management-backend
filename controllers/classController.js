const { Op } = require('sequelize');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const TeacherSubject = require('../models/TeacherSubject');
const Timetable = require('../models/Timetable');

// ─── Classes CRUD ─────────────────────────

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (search) {
      where[Op.or] = [
        { class_name: { [Op.like]: `%${search}%` } },
        { academic_year: { [Op.like]: `%${search}%` } },
      ];
    }
    const { count, rows } = await Class.findAndCountAll({
      where,
      include: [
        { model: Section, as: 'sections' },
        { model: Teacher, as: 'classTeacher', attributes: ['id', 'name'] },
      ],
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [['id', 'DESC']],
    });
    res.json({ classes: rows, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.id, {
      include: [
        { model: Section, as: 'sections' },
        { model: Teacher, as: 'classTeacher', attributes: ['id', 'name'] },
      ],
    });
    if (!cls) return res.status(404).json({ message: 'Not found' });
    res.json(cls);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const cls = await Class.create(req.body);
    res.status(201).json(cls);
  } catch (error) {
    res.status(400).json({ message: 'Invalid data', error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.id);
    if (!cls) return res.status(404).json({ message: 'Not found' });
    await cls.update(req.body);
    res.json(cls);
  } catch (error) {
    res.status(400).json({ message: 'Update failed', error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const cls = await Class.findByPk(req.params.id);
    if (!cls) return res.status(404).json({ message: 'Not found' });
    await Section.destroy({ where: { class_id: cls.id } });
    await Timetable.destroy({ where: { class_id: cls.id } });
    await TeacherSubject.destroy({ where: { class_id: cls.id } });
    await cls.destroy();
    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ message: 'Delete failed', error: error.message });
  }
};

// ─── Sections CRUD ────────────────────────

exports.getSections = async (req, res) => {
  try {
    const sections = await Section.findAll({
      where: { class_id: req.params.classId },
      order: [['name', 'ASC']],
    });
    res.json({ sections });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createSection = async (req, res) => {
  try {
    const section = await Section.create({ ...req.body, class_id: req.params.classId });
    res.status(201).json(section);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateSection = async (req, res) => {
  try {
    const section = await Section.findByPk(req.params.sectionId);
    if (!section) return res.status(404).json({ message: 'Not found' });
    await section.update(req.body);
    res.json(section);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.removeSection = async (req, res) => {
  try {
    const section = await Section.findByPk(req.params.sectionId);
    if (!section) return res.status(404).json({ message: 'Not found' });
    await section.destroy();
    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Timetable (with conflict check) ──────

// Helper: check if a teacher is already booked on a given day + period
async function isTeacherBooked(teacherId, dayOfWeek, periodNumber, excludeEntryId = null) {
  const where = {
    teacher_id: teacherId,
    day_of_week: dayOfWeek,
    period_number: periodNumber,
  };
  if (excludeEntryId) {
    where.id = { [Op.ne]: excludeEntryId };
  }
  const conflict = await Timetable.findOne({ where });
  return !!conflict;
}

exports.getTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findAll({
      where: { class_id: req.params.classId },
      include: [
        { model: Subject, attributes: ['name'] },
        { model: Teacher, attributes: ['name'] },
      ],
      order: [['day_of_week', 'ASC'], ['period_number', 'ASC']],
    });
    res.json(timetable);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createTimetableEntry = async (req, res) => {
  try {
    const { teacher_id, day_of_week, period_number } = req.body;

    // Check for teacher conflict
    if (teacher_id && day_of_week && period_number) {
      const booked = await isTeacherBooked(teacher_id, day_of_week, period_number);
      if (booked) {
        return res.status(400).json({
          message: `The teacher is already assigned to another class during ${day_of_week} period ${period_number}.`
        });
      }
    }

    const entry = await Timetable.create({ ...req.body, class_id: req.params.classId });
    res.status(201).json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateTimetableEntry = async (req, res) => {
  try {
    const entry = await Timetable.findByPk(req.params.entryId);
    if (!entry) return res.status(404).json({ message: 'Not found' });

    const { teacher_id, day_of_week, period_number } = req.body;

    // Check for teacher conflict (exclude current entry)
    if (teacher_id && day_of_week && period_number) {
      const booked = await isTeacherBooked(teacher_id, day_of_week, period_number, entry.id);
      if (booked) {
        return res.status(400).json({
          message: `The teacher is already assigned to another class during ${day_of_week} period ${period_number}.`
        });
      }
    }

    await entry.update(req.body);
    res.json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteTimetableEntry = async (req, res) => {
  try {
    const entry = await Timetable.findByPk(req.params.entryId);
    if (!entry) return res.status(404).json({ message: 'Not found' });
    await entry.destroy();
    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Available Class Teachers ──────────────

exports.getAvailableClassTeachers = async (req, res) => {
  try {
    const usedTeacherIds = (await Section.findAll({
      attributes: ['class_teacher_id'],
      where: { class_teacher_id: { [Op.ne]: null } },
      group: ['class_teacher_id'],
    })).map(s => s.class_teacher_id);

    const usedInClasses = (await Class.findAll({
      attributes: ['class_teacher_id'],
      where: { class_teacher_id: { [Op.ne]: null } },
      group: ['class_teacher_id'],
    })).map(c => c.class_teacher_id);

    const allUsed = [...new Set([...usedTeacherIds, ...usedInClasses])];

    const availableTeachers = await Teacher.findAll({
      where: { id: { [Op.notIn]: allUsed.length > 0 ? allUsed : [0] } },
      order: [['name', 'ASC']],
    });

    res.json(availableTeachers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};