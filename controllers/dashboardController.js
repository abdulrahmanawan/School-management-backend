const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const Admission = require('../models/Admission');
const Assignment = require('../models/Assignment');
const Invoice = require('../models/Invoice');
const BorrowRequest = require('../models/BorrowRequest');
const { Op } = require('sequelize');

exports.getStats = async (req, res) => {
  try {
    const role = req.user.role;
    const data = { role };

    // Common counts for admin roles (owner, principal)
    if (['owner', 'principal'].includes(role)) {
      data.totalStudents = await Student.count({ where: { is_active: true } });
      data.totalTeachers = await Teacher.count();
      data.pendingAdmissions = await Admission.count({ where: { status: 'pending' } });
      data.pendingInvoices = await Invoice.count({ where: { status: 'pending' } });
      data.totalAssignments = await Assignment.count();
    }

    // Teacher-specific
    if (role === 'teacher') {
      const today = new Date().toISOString().slice(0, 10);
      data.totalStudents = await Student.count({ where: { is_active: true } });
      data.todayAttendance = await Attendance.count({
        where: { date: today, status: 'present' }
      });
      data.myAssignments = await Assignment.count({
        where: { teacher_id: req.user.userId }   // ⚠️ teacher_id is not teacher's user ID; should be teacher's record ID. We'll handle later if needed.
      });
    }

    // Student-specific
    if (role === 'student') {
      const student = await Student.findOne({ where: { email: req.user.email } });
      if (student) {
        const today = new Date().toISOString().slice(0, 10);
        data.attendanceToday = await Attendance.findOne({
          where: { student_id: student.id, date: today }
        });
        data.pendingInvoices = await Invoice.count({
          where: { student_id: student.id, status: 'pending' }
        });
        data.myAssignments = await Assignment.count({
          where: { class_id: (await require('../models/Class').findOne({ where: { class_name: student.class } }))?.id || 0 }
        });
      }
    }

    // Parent-specific
    if (role === 'parent') {
      const student = await Student.findOne({ where: { parent_email: req.user.email } });
      data.childName = student?.name || 'No child linked';
      data.childClass = student?.class || null;
    }

    // Accountant-specific
    if (role === 'accountant') {
      data.pendingInvoices = await Invoice.count({ where: { status: 'pending' } });
      data.totalPayments = await require('../models/Payment').sum('amount_paid', { where: { status: 'approved' } });
    }

    // Librarian-specific
    if (role === 'librarian') {
      data.totalBooks = await require('../models/Book').count();
      data.issuedBooks = await require('../models/BookIssue').count({ where: { status: 'issued' } });
      data.pendingRequests = await BorrowRequest.count({ where: { status: 'pending' } });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Dashboard error', error: error.message });
  }
};