const { Op } = require('sequelize');
const Result = require('../models/Result');
const Exam = require('../models/Exam');
const Student = require('../models/Student');

// Get all results (with optional exam_id and student_id filters)
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, exam_id, student_id } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (exam_id) where.exam_id = exam_id;
    if (student_id) where.student_id = student_id;

    const { count, rows } = await Result.findAndCountAll({
      where,
      include: [
        { model: Student, attributes: ['id', 'name', 'class', 'roll_no'] },
        { model: Exam, attributes: ['exam_name', 'total_marks'] },
      ],
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [['id', 'DESC']],
    });
    res.json({ results: rows, total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get students without result for a given exam (to enter marks)
exports.getPendingStudents = async (req, res) => {
  try {
    const { exam_id } = req.params;
    const exam = await Exam.findByPk(exam_id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // Get all students of that class who don't have a result for this exam
    const students = await Student.findAll({
      where: { class: { [Op.like]: `%${exam.class_id}%` } }, // simple matching by class name (you can adjust)
    });
    const existingResults = await Result.findAll({ where: { exam_id }, attributes: ['student_id'] });
    const existingIds = existingResults.map(r => r.student_id);
    const pending = students.filter(s => !existingIds.includes(s.id));
    res.json(pending);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Calculate grade based on percentage
function calculateGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  return 'F';
}

// Enter/update result for a student
exports.createOrUpdate = async (req, res) => {
  try {
    const { exam_id, student_id, marks_obtained } = req.body;
    const exam = await Exam.findByPk(exam_id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    const total = exam.total_marks || 100;
    const percentage = (marks_obtained / total) * 100;
    const grade = calculateGrade(percentage);

    const [result, created] = await Result.findOrCreate({
      where: { exam_id, student_id },
      defaults: { marks_obtained, grade },
    });
    if (!created) {
      result.marks_obtained = marks_obtained;
      result.grade = grade;
      await result.save();
    }
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: 'Save failed', error: error.message });
  }
};

// Bulk enter results for multiple students in one exam
exports.bulkCreate = async (req, res) => {
  try {
    const { exam_id, records } = req.body;
    const exam = await Exam.findByPk(exam_id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    const total = exam.total_marks || 100;

    const promises = records.map(async (rec) => {
      const percentage = (rec.marks_obtained / total) * 100;
      const grade = calculateGrade(percentage);
      const [result, created] = await Result.findOrCreate({
        where: { exam_id, student_id: rec.student_id },
        defaults: { marks_obtained: rec.marks_obtained, grade },
      });
      if (!created) {
        result.marks_obtained = rec.marks_obtained;
        result.grade = grade;
        await result.save();
      }
      return result;
    });
    const results = await Promise.all(promises);
    res.status(201).json(results);
  } catch (error) {
    res.status(400).json({ message: 'Bulk entry failed', error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await Result.findByPk(req.params.id);
    if (!result) return res.status(404).json({ message: 'Not found' });
    await result.destroy();
    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ message: 'Delete failed', error: error.message });
  }
};