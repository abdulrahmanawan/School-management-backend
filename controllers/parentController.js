const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Assignment = require('../models/Assignment');
const Invoice = require('../models/Invoice');
const SubjectResult = require('../models/SubjectResult');
const Subject = require('../models/Subject');
const { Op } = require('sequelize');

// Helper to get child student for logged-in parent
async function getChildStudent(user) {
  return await Student.findOne({ where: { parent_email: user.email } });
}

exports.getChild = async (req, res) => {
  try {
    const student = await getChildStudent(req.user);
    if (!student) return res.status(404).json({ message: 'No child linked to this parent account. Please contact the school.' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getChildAttendance = async (req, res) => {
  try {
    const student = await getChildStudent(req.user);
    if (!student) return res.status(404).json({ message: 'No child linked' });
    const attendance = await Attendance.findAll({
      where: { student_id: student.id },
      order: [['date', 'DESC']],
      limit: 50,
    });
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getChildResults = async (req, res) => {
  try {
    const student = await getChildStudent(req.user);
    if (!student) return res.status(404).json({ message: 'No child linked' });
    const results = await SubjectResult.findAll({
      where: { student_id: student.id },
      include: [{ model: Subject, attributes: ['name'] }],
      order: [['created_at', 'DESC']],
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getChildAssignments = async (req, res) => {
  try {
    const student = await getChildStudent(req.user);
    if (!student) return res.status(404).json({ message: 'No child linked' });
    const submissions = await AssignmentSubmission.findAll({
      where: { student_id: student.id },
      include: [{ model: Assignment, attributes: ['id','title','type','subject_id','total_marks','passing_marks'] }],
      order: [['submitted_at', 'DESC']],
    });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getChildFinance = async (req, res) => {
  try {
    const student = await getChildStudent(req.user);
    if (!student) return res.status(404).json({ message: 'No child linked' });
    const invoices = await Invoice.findAll({
      where: { student_id: student.id },
      order: [['created_at', 'DESC']],
    });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};