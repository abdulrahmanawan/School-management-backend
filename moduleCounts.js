const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const AssignmentSubmission = require('./models/AssignmentSubmission');
const Invoice = require('./models/Invoice');
const Payment = require('./models/Payment');
const BorrowRequest = require('./models/BorrowRequest');
const BookIssue = require('./models/BookIssue');
const Admission = require('./models/Admission');
const { Op } = require('sequelize');
const User = require('./models/User');

async function computeModuleCountsForUser(userId) {
  const user = await User.findByPk(userId);
  if (!user) return {};

  const role = user.role;
  const email = user.email;

  if (role === 'student') {
    const student = await Student.findOne({ where: { email } });
    if (!student) return {};

    const pendingAssignments = await AssignmentSubmission.count({
      where: { student_id: student.id, status: 'submitted' },
    });

    const unpaidInvoices = await Invoice.count({
      where: { student_id: student.id, status: { [Op.ne]: 'paid' } },
    });

    const pendingBorrowRequests = await BorrowRequest.count({
      where: { borrower_id: student.id, borrower_type: 'student', status: 'pending' },
    });

    const overdueIssues = await BookIssue.count({
      where: {
        borrower_id: student.id,
        borrower_type: 'student',
        status: 'issued',
        due_date: { [Op.lt]: new Date().toISOString().slice(0, 10) },
      },
    });

    return {
      assignments: pendingAssignments,
      finance: unpaidInvoices,
      library: pendingBorrowRequests + overdueIssues,
      admissions: 0,
      announcements: 0,
      onlineClasses: 0,
    };
  }

  if (role === 'teacher') {
    const teacher = await Teacher.findOne({ where: { email } });
    if (!teacher) return {};

    const pendingSubmissions = await AssignmentSubmission.count({
      where: { status: 'submitted' },
      include: [
        {
          model: require('./models/Assignment'),
          as: 'Assignment',
          attributes: [],
          where: { teacher_id: teacher.id },
        },
      ],
    });

    const pendingBorrowRequests = await BorrowRequest.count({
      where: { borrower_type: 'teacher', borrower_id: teacher.id, status: 'pending' },
    });

    return {
      assignments: pendingSubmissions,
      finance: 0,
      library: pendingBorrowRequests,
      admissions: 0,
      announcements: 0,
      onlineClasses: 0,
    };
  }

  // Admin roles
  const pendingAssignments = await AssignmentSubmission.count({
    where: { status: 'submitted' },
  });

  const pendingPayments = await Payment.count({
    where: { status: 'pending' },
  });

  const pendingBorrowRequests = await BorrowRequest.count({
    where: { status: 'pending' },
  });

  const pendingAdmissions = await Admission.count({
    where: { status: 'pending' },
  });

  return {
    assignments: pendingAssignments,
    finance: pendingPayments,
    library: pendingBorrowRequests,
    admissions: pendingAdmissions,
    announcements: 0,
    onlineClasses: 0,
  };
}

module.exports = { computeModuleCountsForUser };