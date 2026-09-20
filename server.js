// Load environment variables (local dev ke liye, Render par dashboard se aayenge)
require('dotenv').config();

const app = require('./app');
const sequelize = require('./config/db');
const http = require('http');
const { initSocket } = require('./socket');

// ── Import all models ──
const User = require('./models/User');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const Class = require('./models/Class');
const Section = require('./models/Section');
const Subject = require('./models/Subject');
const TeacherSubject = require('./models/TeacherSubject');
const Attendance = require('./models/Attendance');
const Guardian = require('./models/Guardian');
const StudentGuardian = require('./models/StudentGuardian');
const GradeScale = require('./models/GradeScale');
const Assignment = require('./models/Assignment');
const AssignmentTask = require('./models/AssignmentTask');
const Submission = require('./models/Submission');
const AssignmentTaskSubmission = require('./models/AssignmentTaskSubmission');
const Book = require('./models/Book');
const BookIssue = require('./models/BookIssue');
const Vehicle = require('./models/Vehicle');
const StudentTransport = require('./models/StudentTransport');
const HostelRoom = require('./models/HostelRoom');
const HostelAssignment = require('./models/HostelAssignment');
const FeeStructure = require('./models/FeeStructure');
const FeeStructureItem = require('./models/FeeStructureItem');
const Invoice = require('./models/Invoice');
const InvoiceItem = require('./models/InvoiceItem');
const Payment = require('./models/Payment');
const FinanceSetting = require('./models/FinanceSetting');
const OnlineClass = require('./models/OnlineClass');
const Timetable = require('./models/Timetable');
const Admission = require('./models/Admission');
const Message = require('./models/Message');
const AnnouncementModel = require('./models/Announcement');
const Notification = require('./models/Notification');
const BorrowRequest = require('./models/BorrowRequest');
const SubjectResult = require('./models/SubjectResult');

// Assignment detailed models
const AssignmentQuestion = require('./models/AssignmentQuestion');
const AssignmentOption = require('./models/AssignmentOption');
const AssignmentSubmission = require('./models/AssignmentSubmission');
const AssignmentAnswer = require('./models/AssignmentAnswer');

// ── Associations ──

// Student <-> Guardian
Student.belongsToMany(Guardian, { through: StudentGuardian, foreignKey: 'student_id', as: 'guardians' });
Guardian.belongsToMany(Student, { through: StudentGuardian, foreignKey: 'guardian_id', as: 'students' });

// Teacher <-> Subject
Teacher.belongsToMany(Subject, { through: TeacherSubject, foreignKey: 'teacher_id', as: 'subjects' });
Subject.belongsToMany(Teacher, { through: TeacherSubject, foreignKey: 'subject_id', as: 'teachers' });

TeacherSubject.belongsTo(Teacher, { foreignKey: 'teacher_id' });
Teacher.hasMany(TeacherSubject, { foreignKey: 'teacher_id' });
TeacherSubject.belongsTo(Class, { foreignKey: 'class_id' });
Class.hasMany(TeacherSubject, { foreignKey: 'class_id' });

// Class <-> Section
Class.hasMany(Section, { foreignKey: 'class_id', as: 'sections' });
Section.belongsTo(Class, { foreignKey: 'class_id' });
Section.belongsTo(Teacher, { foreignKey: 'class_teacher_id', as: 'classTeacher' });

// Class teacher
Class.belongsTo(Teacher, { foreignKey: 'class_teacher_id', as: 'classTeacher' });

// Attendance
Attendance.belongsTo(Student, { foreignKey: 'student_id' });
Attendance.belongsTo(Class, { foreignKey: 'class_id' });
Student.hasMany(Attendance, { foreignKey: 'student_id', onDelete: 'CASCADE' });

// ── Legacy assignment associations ──
Assignment.belongsTo(Teacher, { foreignKey: 'teacher_id' });
Assignment.belongsTo(Class, { foreignKey: 'class_id' });
Assignment.hasMany(AssignmentTask, { foreignKey: 'assignment_id', as: 'tasks' });
AssignmentTask.belongsTo(Assignment, { foreignKey: 'assignment_id' });
Assignment.hasMany(Submission, { foreignKey: 'assignment_id', as: 'submissions' });
Submission.belongsTo(Assignment, { foreignKey: 'assignment_id' });
Submission.belongsTo(Student, { foreignKey: 'student_id' });
Submission.hasMany(AssignmentTaskSubmission, { foreignKey: 'submission_id', as: 'taskSubmissions' });
AssignmentTaskSubmission.belongsTo(Submission, { foreignKey: 'submission_id' });
AssignmentTaskSubmission.belongsTo(AssignmentTask, { foreignKey: 'task_id' });

// ── New assignment associations ──
Assignment.belongsTo(Subject, { foreignKey: 'subject_id' });
Subject.hasMany(Assignment, { foreignKey: 'subject_id' });

Assignment.hasMany(AssignmentQuestion, { foreignKey: 'assignment_id', as: 'questions' });
AssignmentQuestion.belongsTo(Assignment, { foreignKey: 'assignment_id' });

AssignmentQuestion.hasMany(AssignmentOption, { foreignKey: 'question_id', as: 'options' });
AssignmentOption.belongsTo(AssignmentQuestion, { foreignKey: 'question_id' });

AssignmentSubmission.belongsTo(Assignment, { foreignKey: 'assignment_id' });
Assignment.hasMany(AssignmentSubmission, { foreignKey: 'assignment_id' });

AssignmentSubmission.belongsTo(Student, { foreignKey: 'student_id' });
Student.hasMany(AssignmentSubmission, { foreignKey: 'student_id' });

AssignmentAnswer.belongsTo(AssignmentSubmission, { foreignKey: 'submission_id' });
AssignmentSubmission.hasMany(AssignmentAnswer, { foreignKey: 'submission_id' });

AssignmentAnswer.belongsTo(AssignmentQuestion, { foreignKey: 'question_id' });

// ── Library ──
Book.hasMany(BookIssue, { foreignKey: 'book_id', as: 'issues' });
BookIssue.belongsTo(Book, { foreignKey: 'book_id' });
BookIssue.belongsTo(Student, { foreignKey: 'borrower_id', as: 'Student', constraints: false });
BookIssue.belongsTo(Teacher, { foreignKey: 'borrower_id', as: 'Teacher', constraints: false });

Book.hasMany(BorrowRequest, { foreignKey: 'book_id', as: 'requests' });
BorrowRequest.belongsTo(Book, { foreignKey: 'book_id' });
BorrowRequest.belongsTo(Student, { foreignKey: 'borrower_id', as: 'Student', constraints: false });
BorrowRequest.belongsTo(Teacher, { foreignKey: 'borrower_id', as: 'Teacher', constraints: false });

// Transport
Vehicle.hasMany(StudentTransport, { foreignKey: 'vehicle_id' });
StudentTransport.belongsTo(Vehicle, { foreignKey: 'vehicle_id' });
StudentTransport.belongsTo(Student, { foreignKey: 'student_id' });

// Hostel
HostelRoom.hasMany(HostelAssignment, { foreignKey: 'room_id' });
HostelAssignment.belongsTo(HostelRoom, { foreignKey: 'room_id' });
HostelAssignment.belongsTo(Student, { foreignKey: 'student_id' });

// ── Finance ──
Class.hasMany(FeeStructure, { foreignKey: 'class_id' });
FeeStructure.hasMany(FeeStructureItem, { foreignKey: 'fee_structure_id', as: 'items', onDelete: 'CASCADE' });

Student.hasMany(Invoice, { foreignKey: 'student_id' });
Class.hasMany(Invoice, { foreignKey: 'class_id' });

Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'items', onDelete: 'CASCADE' });
Invoice.hasMany(Payment, { foreignKey: 'invoice_id', as: 'payments', onDelete: 'CASCADE' });

User.hasMany(Payment, { foreignKey: 'submitted_by_user_id', as: 'submittedByUser' });

// Online Class
OnlineClass.belongsTo(Teacher, { foreignKey: 'teacher_id' });
OnlineClass.belongsTo(Class, { foreignKey: 'class_id', onDelete: 'SET NULL' });
Class.hasMany(OnlineClass, { foreignKey: 'class_id', onDelete: 'SET NULL' });

// Timetable
Timetable.belongsTo(Class, { foreignKey: 'class_id' });
Timetable.belongsTo(Subject, { foreignKey: 'subject_id' });
Timetable.belongsTo(Teacher, { foreignKey: 'teacher_id' });

// Admission
Admission.belongsTo(Class, { foreignKey: 'desired_class', targetKey: 'class_name', constraints: false });

// SubjectResult
SubjectResult.belongsTo(Subject, { foreignKey: 'subject_id' });
SubjectResult.belongsTo(Student, { foreignKey: 'student_id' });
SubjectResult.belongsTo(Teacher, { foreignKey: 'teacher_id' });

// ── Start server ──
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

sequelize.sync()
  .then(() => {
    server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  })
  .catch(err => console.error('❌ Database sync failed:', err));