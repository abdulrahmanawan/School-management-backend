const { Op } = require('sequelize');
const Assignment = require('../models/Assignment');
const AssignmentQuestion = require('../models/AssignmentQuestion');
const AssignmentOption = require('../models/AssignmentOption');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const AssignmentAnswer = require('../models/AssignmentAnswer');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Timetable = require('../models/Timetable');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendNotificationToUser, sendNotificationToRole } = require('./notificationController');

// Helper: get teacher id from logged‑in user
async function getTeacherId(user) {
  const teacher = await Teacher.findOne({ where: { email: user.email } });
  return teacher ? teacher.id : null;
}

// Helper – uses timetable to find classes & subjects a teacher teaches
async function getTeacherAssignable(user) {
  const teacher = await Teacher.findOne({ where: { email: user.email } });
  if (!teacher) return { classes: [], subjectsMap: {} };

  const timetableRows = await Timetable.findAll({
    where: { teacher_id: teacher.id },
    attributes: ['class_id', 'subject_id'],
    raw: true,
  });

  if (timetableRows.length === 0) return { classes: [], subjectsMap: {} };

  const classIds = [...new Set(timetableRows.map(t => t.class_id).filter(Boolean))];
  const subjectIds = [...new Set(timetableRows.map(t => t.subject_id).filter(Boolean))];

  const classes = classIds.length
    ? await Class.findAll({ where: { id: { [Op.in]: classIds } }, attributes: ['id', 'class_name'], raw: true })
    : [];
  const subjects = subjectIds.length
    ? await Subject.findAll({ where: { id: { [Op.in]: subjectIds } }, attributes: ['id', 'name'], raw: true })
    : [];

  const subjectsMap = {};
  timetableRows.forEach(row => {
    const classId = row.class_id;
    if (!classId) return;
    if (!subjectsMap[classId]) subjectsMap[classId] = [];
    const sub = subjects.find(s => s.id === row.subject_id);
    if (sub && !subjectsMap[classId].some(s => s.id === sub.id)) {
      subjectsMap[classId].push(sub);
    }
  });

  return { classes, subjectsMap };
}

// ─── 1. List assignments ───
exports.getAll = async (req, res) => {
  try {
    const user = req.user;
    let where = {};
    if (user.role === 'student') {
      const student = await Student.findOne({ where: { email: user.email } });
      if (student) {
        const classRec = await Class.findOne({ where: { class_name: student.class } });
        if (classRec) where.class_id = classRec.id;
        else return res.json({ assignments: [], total: 0 });
      }
    } else if (user.role === 'teacher') {
      const teacherId = await getTeacherId(user);
      if (teacherId) where.teacher_id = teacherId;
      else return res.json({ assignments: [], total: 0 });
    }

    const { count, rows } = await Assignment.findAndCountAll({
      where,
      include: [
        { model: Class, attributes: ['class_name'] },
        { model: Subject, attributes: ['name'] },
        { model: Teacher, attributes: ['name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 100,
    });
    res.json({ assignments: rows, total: count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 2. Get assignable classes & subjects ───
exports.getAssignable = async (req, res) => {
  try {
    const user = req.user;
    if (user.role === 'superadmin' || user.role === 'principal') {
      const allClasses = await Class.findAll({ attributes: ['id', 'class_name'] });
      const allSubjects = await Subject.findAll({ attributes: ['id', 'name'] });
      const subjectsMap = {};
      allClasses.forEach(c => { subjectsMap[c.id] = allSubjects; });
      return res.json({ classes: allClasses, subjectsMap });
    } else if (user.role === 'teacher') {
      const { classes, subjectsMap } = await getTeacherAssignable(user);
      return res.json({ classes, subjectsMap });
    } else {
      return res.json({ classes: [], subjectsMap: {} });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 3. Create assignment ───
exports.create = async (req, res) => {
  try {
    const user = req.user;
    const teacherId = await getTeacherId(user);

    const { title, description, class_id, subject_id, type, due_date, questions, passing_marks } = req.body;
    if (!title || !class_id || !subject_id || !type || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (user.role === 'teacher') {
      if (!teacherId) return res.status(403).json({ message: 'Teacher record not found' });
      const { classes, subjectsMap } = await getTeacherAssignable(user);
      const cls = classes.find(c => c.id === Number(class_id));
      if (!cls) return res.status(403).json({ message: 'You do not teach this class' });
      const subs = subjectsMap[class_id] || [];
      const sub = subs.find(s => s.id === Number(subject_id));
      if (!sub) return res.status(403).json({ message: 'You do not teach this subject in this class' });
    }

    let total_marks = 0;
    questions.forEach(q => { total_marks += (q.marks || 0); });

    const assignment = await Assignment.create({
      title, description, class_id,
      teacher_id: teacherId,
      subject_id, type, due_date, total_marks,
      passing_marks: passing_marks ? Number(passing_marks) : null,
    });

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const question = await AssignmentQuestion.create({
        assignment_id: assignment.id,
        question_text: q.question_text,
        marks: q.marks || 1,
        order: i + 1,
      });
      if (type === 'mcq' && Array.isArray(q.options)) {
        for (const opt of q.options) {
          await AssignmentOption.create({
            question_id: question.id,
            option_text: opt.text,
            is_correct: opt.is_correct || false,
          });
        }
      }
    }

    const createdAssignment = await Assignment.findByPk(assignment.id, {
      include: [{ model: AssignmentQuestion, as: 'questions', include: [{ model: AssignmentOption, as: 'options' }] }]
    });

    // 🔔 Notify all students of the class (real‑time)
    const classRec = await Class.findByPk(class_id);
    if (classRec) {
      const students = await Student.findAll({ where: { class: classRec.class_name, is_active: true } });
      for (const student of students) {
        const user = await User.findOne({ where: { email: student.email } });
        if (user) {
          await sendNotificationToUser(user.id, `📝 New assignment "${title}" due ${due_date || 'soon'}`);
        }
      }
    }

    // 🔔 Notify principal/teacher roles
    await sendNotificationToRole('principal', `📝 Assignment "${title}" created by ${user.email}`);
    await sendNotificationToRole('teacher', `📝 Assignment "${title}" created`);

    res.status(201).json(createdAssignment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── 4. Get single assignment ───
exports.getOne = async (req, res) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id, {
      include: [
        { model: AssignmentQuestion, as: 'questions', include: [{ model: AssignmentOption, as: 'options' }] },
        { model: Class, attributes: ['class_name'] },
        { model: Subject, attributes: ['name'] },
        { model: Teacher, attributes: ['name'] }
      ],
      order: [[{ model: AssignmentQuestion, as: 'questions' }, 'order', 'ASC']]
    });
    if (!assignment) return res.status(404).json({ message: 'Not found' });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 5. Student submits work ───
exports.submit = async (req, res) => {
  try {
    const user = req.user;
    const student = await Student.findOne({ where: { email: user.email } });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const assignmentId = req.params.assignmentId;
    const assignment = await Assignment.findByPk(assignmentId, {
      include: [{ model: AssignmentQuestion, as: 'questions', include: [{ model: AssignmentOption, as: 'options' }] }]
    });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    const existing = await AssignmentSubmission.findOne({
      where: { assignment_id: assignmentId, student_id: student.id }
    });
    if (existing) return res.status(400).json({ message: 'Already submitted' });

    const { answers } = req.body;
    const submission = await AssignmentSubmission.create({
      assignment_id: assignmentId, student_id: student.id, status: 'submitted',
    });

    let totalObtained = 0;
    const answerRecords = [];
    if (assignment.type === 'mcq') {
      for (const ans of answers) {
        const question = assignment.questions.find(q => q.id === ans.question_id);
        if (!question) continue;
        let correctOption = question.options.find(o => o.is_correct);
        let obtained = 0;
        if (ans.selected_option_id && correctOption && ans.selected_option_id === correctOption.id) {
          obtained = question.marks;
          totalObtained += obtained;
        }
        answerRecords.push({
          submission_id: submission.id,
          question_id: ans.question_id,
          selected_option_id: ans.selected_option_id,
          marks_obtained: obtained,
        });
      }
      await AssignmentAnswer.bulkCreate(answerRecords);
      submission.total_obtained_marks = totalObtained;
      submission.status = 'graded';
      await submission.save();

      // 🔔 Notify student that MCQ auto‑graded
      await sendNotificationToUser(user.userId, `📊 Your MCQ assignment "${assignment.title}" has been auto-graded. Marks: ${totalObtained}/${assignment.total_marks}`);

      const resultQuestions = assignment.questions.map(q => {
        const studentAns = answerRecords.find(a => a.question_id === q.id);
        const correctOptId = q.options.find(o => o.is_correct)?.id;
        return {
          question_id: q.id,
          question_text: q.question_text,
          options: q.options,
          selected_option_id: studentAns?.selected_option_id,
          correct_option_id: correctOptId,
          marks_obtained: studentAns?.marks_obtained || 0,
          total_marks: q.marks,
        };
      });
      res.status(201).json({ submission, total_obtained_marks: totalObtained, total_marks: assignment.total_marks, questions: resultQuestions });
    } else {
      for (const ans of answers) {
        answerRecords.push({
          submission_id: submission.id,
          question_id: ans.question_id,
          answer_text: ans.answer_text || '',
        });
      }
      await AssignmentAnswer.bulkCreate(answerRecords);

      // 🔔 Notify teacher/principal of new submission
      if (assignment.teacher_id) {
        const teacher = await Teacher.findByPk(assignment.teacher_id);
        if (teacher) {
          const teacherUser = await User.findOne({ where: { email: teacher.email } });
          if (teacherUser) await sendNotificationToUser(teacherUser.id, `📥 Student ${student.name} submitted "${assignment.title}"`);
        }
      }
      await sendNotificationToRole('principal', `📥 Student ${student.name} submitted "${assignment.title}"`);

      res.status(201).json({ submission, message: 'Submitted. Awaiting grading.' });
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── 6. Get submissions for an assignment ───
exports.getSubmissions = async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId;
    const submissions = await AssignmentSubmission.findAll({
      where: { assignment_id: assignmentId },
      include: [{ model: Student, attributes: ['id', 'name', 'class', 'roll_no'] }],
      order: [['submitted_at', 'DESC']],
    });
    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 7. Get one submission detail ───
exports.getSubmissionDetail = async (req, res) => {
  try {
    const submission = await AssignmentSubmission.findByPk(req.params.submissionId, {
      include: [
        { model: Student, attributes: ['id', 'name', 'class'] },
        { model: Assignment, include: [
            { model: AssignmentQuestion, as: 'questions', include: [{ model: AssignmentOption, as: 'options' }] }
          ]
        },
      ],
    });
    if (!submission) return res.status(404).json({ message: 'Not found' });
    const answers = await AssignmentAnswer.findAll({
      where: { submission_id: submission.id },
      include: [{ model: AssignmentQuestion, attributes: ['question_text', 'marks'] }],
    });
    res.json({ submission, answers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 8. Grade a QA submission (prevent re‑grading) ───
exports.gradeSubmission = async (req, res) => {
  try {
    const submissionId = req.params.submissionId;
    const submission = await AssignmentSubmission.findByPk(submissionId);
    if (!submission) return res.status(404).json({ message: 'Not found' });

    if (submission.status === 'graded') {
      return res.status(400).json({ message: 'Already graded. You cannot modify grades.' });
    }

    const { answers } = req.body;
    let totalObtained = 0;
    for (const item of answers) {
      await AssignmentAnswer.update(
        { marks_obtained: item.marks_obtained, teacher_comment: item.teacher_comment || null },
        { where: { submission_id: submissionId, question_id: item.question_id } }
      );
      totalObtained += item.marks_obtained;
    }
    submission.total_obtained_marks = totalObtained;
    submission.status = 'graded';
    await submission.save();

    // 🔔 Notify student of grade
    const student = await Student.findByPk(submission.student_id);
    if (student) {
      const user = await User.findOne({ where: { email: student.email } });
      if (user) {
        await sendNotificationToUser(user.id, `📊 Your assignment has been graded. Marks: ${totalObtained}/${submission.Assignment?.total_marks || 'N/A'}`);
      }
    }

    res.json({ message: 'Grading saved', submission });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ─── 9. Update / delete assignment ───
exports.update = async (req, res) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Not found' });
    await assignment.update(req.body);
    res.json(assignment);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.remove = async (req, res) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Not found' });

    const questions = await AssignmentQuestion.findAll({ where: { assignment_id: assignment.id } });
    const questionIds = questions.map(q => q.id);

    if (questionIds.length) {
      await AssignmentOption.destroy({ where: { question_id: { [Op.in]: questionIds } } });
    }

    const submissions = await AssignmentSubmission.findAll({ where: { assignment_id: assignment.id } });
    const submissionIds = submissions.map(s => s.id);

    if (submissionIds.length) {
      await AssignmentAnswer.destroy({ where: { submission_id: { [Op.in]: submissionIds } } });
    }

    await AssignmentSubmission.destroy({ where: { assignment_id: assignment.id } });
    await AssignmentQuestion.destroy({ where: { assignment_id: assignment.id } });
    await assignment.destroy();

    res.sendStatus(204);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─── 10. Student dashboard count ───
exports.getStudentAssignments = async (req, res) => {
  try {
    const student = await Student.findOne({ where: { email: req.user.email } });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const classRec = await Class.findOne({ where: { class_name: student.class } });
    if (!classRec) return res.json({ total: 0 });
    const count = await Assignment.count({ where: { class_id: classRec.id } });
    res.json({ total: count });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─── 11. Get student's own submission ───
exports.getMySubmission = async (req, res) => {
  try {
    const student = await Student.findOne({ where: { email: req.user.email } });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const submission = await AssignmentSubmission.findOne({
      where: { assignment_id: req.params.assignmentId, student_id: student.id },
      include: [{ model: Assignment, include: [{ model: AssignmentQuestion, as: 'questions', include: [{ model: AssignmentOption, as: 'options' }] }] }]
    });
    if (!submission) return res.status(404).json({ message: 'No submission' });
    res.json({ submission });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─── 12. Get all submissions for logged‑in student (for results page) ───
exports.getMySubmissions = async (req, res) => {
  try {
    const student = await Student.findOne({ where: { email: req.user.email } });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const submissions = await AssignmentSubmission.findAll({
      where: { student_id: student.id },
      include: [
        {
          model: Assignment,
          attributes: ['id', 'title', 'type', 'subject_id', 'total_marks', 'passing_marks'],
          include: [{ model: Subject, attributes: ['name'] }]
        }
      ],
      order: [['submitted_at', 'DESC']],
    });
    res.json({ submissions });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─── 13. Get students of a class for an assignment (with submission status & passing info) ───
exports.getClassStudents = async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const assignment = await Assignment.findByPk(assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    const classRec = await Class.findByPk(assignment.class_id);
    if (!classRec) return res.status(404).json({ message: 'Class not found' });

    const students = await Student.findAll({
      where: {
        class: classRec.class_name,
        is_active: true,
      },
      attributes: ['id', 'name', 'roll_no', 'email'],
      order: [['roll_no', 'ASC']],
    });

    const submissions = await AssignmentSubmission.findAll({
      where: { assignment_id: assignmentId },
      attributes: ['id', 'student_id', 'status', 'total_obtained_marks', 'submitted_at'],
    });

    const studentList = students.map(student => {
      const sub = submissions.find(s => s.student_id === student.id);
      const obtained = sub ? sub.total_obtained_marks : 0;
      const passed = assignment.passing_marks ? (obtained >= assignment.passing_marks) : null;
      return {
        student_id: student.id,
        name: student.name,
        roll_no: student.roll_no,
        email: student.email,
        submitted: !!sub,
        submission_id: sub?.id || null,
        status: sub?.status || null,
        obtained_marks: obtained,
        total_marks: assignment.total_marks,
        passing_marks: assignment.passing_marks,
        passed,
        submitted_at: sub?.submitted_at || null,
      };
    });

    res.json({ students: studentList, total_marks: assignment.total_marks, passing_marks: assignment.passing_marks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── 14. Notify unsubmitted students ───
exports.notifyUnsubmitted = async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const assignment = await Assignment.findByPk(assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    const classRec = await Class.findByPk(assignment.class_id);
    if (!classRec) return res.status(404).json({ message: 'Class not found' });

    const allStudents = await Student.findAll({
      where: {
        class: classRec.class_name,
        is_active: true,
      },
      attributes: ['email', 'id'],
    });

    const submissions = await AssignmentSubmission.findAll({
      where: { assignment_id: assignmentId },
      attributes: ['student_id'],
    });
    const submittedIds = submissions.map(s => s.student_id);
    const unsubmittedStudents = allStudents.filter(s => !submittedIds.includes(s.id));

    if (unsubmittedStudents.length === 0) {
      return res.json({ message: 'All students have submitted.' });
    }

    for (const student of unsubmittedStudents) {
      const user = await User.findOne({ where: { email: student.email } });
      if (user) {
        await sendNotificationToUser(user.id, `⏰ Reminder: Complete assignment "${assignment.title}" before ${assignment.due_date || 'due date'}.`);
      }
    }

    res.json({ message: `Notification sent to ${unsubmittedStudents.length} students.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};