const { Op } = require('sequelize');

const SubjectResult = require('../models/SubjectResult');

const Student = require('../models/Student');

const Teacher = require('../models/Teacher');

const Class = require('../models/Class');

const Subject = require('../models/Subject');

const Timetable = require('../models/Timetable');

const User = require('../models/User');

const {
  sendNotificationToUser,
  sendNotificationToRole
} = require('./notificationController');

const {
  sendModuleUpdateToUser,
  sendModuleUpdateToRole
} = require('../socket');

/* Helper: get teacher id from email */

async function getTeacherId(user) {
  const teacher =
    await Teacher.findOne({
      where: {
        email: user.email
      }
    });

  return teacher
    ? teacher.id
    : null;
}

/* Get all subject results (with optional class/subject filters) – for teachers/admins */
/* ✅ Only include results of active students */

exports.getAll = async (
  req,
  res
) => {
  try {
    const {
      class_id,
      subject_id,
      page = 1,
      limit = 20
    } = req.query;

    const where = {};

    if (class_id) {
      where.class_id =
        class_id;
    }

    if (subject_id) {
      where.subject_id =
        subject_id;
    }

    const offset =
      (page - 1) * limit;

    const {
      count,
      rows
    } =
      await SubjectResult.findAndCountAll(
        {
          where,
          include: [
            {
              model: Student,
              attributes: [
                'id',
                'name',
                'roll_no',
                'class'
              ],
              where: {
                is_active:
                  true
              },
              required:
                true
            },
            {
              model: Subject,
              attributes: [
                'id',
                'name'
              ]
            },
            {
              model: Teacher,
              attributes: [
                'id',
                'name'
              ]
            }
          ],
          offset: parseInt(
            offset
          ),
          limit: parseInt(
            limit
          ),
          order: [
            [
              'created_at',
              'DESC'
            ]
          ]
        }
      );

    res.json({
      results: rows,
      total: count,
      page: parseInt(
        page
      ),
      limit
    });
  } catch (err) {
    res.status(500).json({
      message:
        err.message
    });
  }
};

/* Get classes that the logged-in teacher teaches (via timetable) */

exports.getMyClasses =
  async (req, res) => {
    try {
      const user =
        req.user;

      if (
        user.role ===
          'superadmin' ||
        user.role ===
          'principal'
      ) {
        const allClasses =
          await Class.findAll({
            attributes: [
              'id',
              'class_name'
            ]
          });

        return res.json(
          allClasses
        );
      }

      const teacherId =
        await getTeacherId(
          user
        );

      if (!teacherId) {
        return res.status(403).json({
          message:
            'Teacher not found'
        });
      }

      const timetableRows =
        await Timetable.findAll({
          where: {
            teacher_id:
              teacherId
          },
          attributes: [
            'class_id'
          ],
          raw: true
        });

      const classIds = [
        ...new Set(
          timetableRows.map(
            t =>
              t.class_id
          )
        )
      ];

      const classes =
        await Class.findAll({
          where: {
            id: {
              [Op.in]:
                classIds
            }
          },
          attributes: [
            'id',
            'class_name'
          ]
        });

      res.json(
        classes
      );
    } catch (err) {
      res.status(500).json({
        message:
          err.message
      });
    }
  };

/* Get subjects that the logged-in teacher teaches in a given class */

exports.getMySubjectsForClass =
  async (req, res) => {
    try {
      const user =
        req.user;

      const classId =
        req.params.classId;

      if (
        user.role ===
          'superadmin' ||
        user.role ===
          'principal'
      ) {
        const subjects =
          await Subject.findAll({
            attributes: [
              'id',
              'name'
            ]
          });

        return res.json(
          subjects
        );
      }

      const teacherId =
        await getTeacherId(
          user
        );

      if (!teacherId) {
        return res.status(403).json({
          message:
            'Teacher not found'
        });
      }

      const rows =
        await Timetable.findAll({
          where: {
            teacher_id:
              teacherId,
            class_id:
              classId
          },
          attributes: [
            'subject_id'
          ],
          raw: true
        });

      const subjectIds = [
        ...new Set(
          rows.map(
            r =>
              r.subject_id
          )
        )
      ];

      const subjects =
        await Subject.findAll({
          where: {
            id: {
              [Op.in]:
                subjectIds
            }
          },
          attributes: [
            'id',
            'name'
          ]
        });

      res.json(
        subjects
      );
    } catch (err) {
      res.status(500).json({
        message:
          err.message
      });
    }
  };

/* Get students of a class – only active ones */

exports.getStudentsForClass =
  async (req, res) => {
    try {
      const classId =
        req.params.classId;

      const classRec =
        await Class.findByPk(
          classId
        );

      if (!classRec) {
        return res.status(404).json({
          message:
            'Class not found'
        });
      }

      const students =
        await Student.findAll({
          where: {
            class:
              classRec.class_name,
            is_active:
              true
          },
          attributes: [
            'id',
            'name',
            'roll_no'
          ],
          order: [
            [
              'roll_no',
              'ASC'
            ]
          ]
        });

      res.json(
        students
      );
    } catch (err) {
      res.status(500).json({
        message:
          err.message
      });
    }
  };

/* Upload / bulk save subject results */

exports.uploadResults =
  async (req, res) => {
    try {
      const user =
        req.user;

      const teacherId =
        await getTeacherId(
          user
        );

      const {
        class_id,
        subject_id,
        total_marks,
        passing_marks,
        results
      } = req.body;

      if (
        !class_id ||
        !subject_id ||
        !total_marks ||
        !Array.isArray(
          results
        )
      ) {
        return res.status(400).json({
          message:
            'Missing fields'
        });
      }

      const subject =
        await Subject.findByPk(
          subject_id
        );

      if (!subject) {
        return res.status(404).json({
          message:
            'Subject not found'
        });
      }

      const classRec =
        await Class.findByPk(
          class_id
        );

      if (!classRec) {
        return res.status(404).json({
          message:
            'Class not found'
        });
      }

      const passing =
        passing_marks ||
        Math.floor(
          total_marks * 0.33
        );

      const uploads = [];

      const notifiedStudents =
        new Set();

      for (const item of results) {
        const {
          student_id,
          marks_obtained
        } = item;

        const percentage =
          (marks_obtained /
            total_marks) *
          100;

        let grade = 'F';

        if (
          percentage >= 90
        ) {
          grade = 'A+';
        } else if (
          percentage >= 80
        ) {
          grade = 'A';
        } else if (
          percentage >= 70
        ) {
          grade = 'B+';
        } else if (
          percentage >= 60
        ) {
          grade = 'B';
        } else if (
          percentage >= 50
        ) {
          grade = 'C';
        }

        const [
          result,
          created
        ] =
          await SubjectResult.findOrCreate(
            {
              where: {
                student_id,
                subject_id,
                class_id:
                  class_id
              },
              defaults: {
                marks_obtained,
                total_marks,
                passing_marks:
                  passing,
                grade,
                teacher_id:
                  teacherId ||
                  null
              }
            }
          );

        if (!created) {
          result.marks_obtained =
            marks_obtained;

          result.total_marks =
            total_marks;

          result.passing_marks =
            passing;

          result.grade =
            grade;

          result.teacher_id =
            teacherId ||
            null;

          await result.save();
        }

        uploads.push(
          result
        );

        /* 🔔 Notify the student about their result */

        if (
          !notifiedStudents.has(
            student_id
          )
        ) {
          notifiedStudents.add(
            student_id
          );

          const student =
            await Student.findByPk(
              student_id
            );

          if (
            student &&
            student.is_active
          ) {
            const user =
              await User.findOne({
                where: {
                  email:
                    student.email
                }
              });

            if (user) {
              await sendNotificationToUser(
                user.id,
                `📊 Result uploaded for ${subject.name}. Marks: ${marks_obtained}/${total_marks}, Grade: ${grade}`
              );

              /* 🔄 Update student's module counts */

              await sendModuleUpdateToUser(
                user.id
              );
            }
          }
        }
      }

      /* 🔔 Notify principal and teachers about uploaded results */

      await sendNotificationToRole(
        'principal',
        `📊 Results uploaded for class ${classRec.class_name}, subject ${subject.name}`
      );

      await sendNotificationToRole(
        'teacher',
        `📊 Results uploaded for class ${classRec.class_name}, subject ${subject.name}`
      );

      /* 🔄 Update module counts for relevant admin/teacher roles */

      await sendModuleUpdateToRole(
        'principal'
      );

      await sendModuleUpdateToRole(
        'owner'
      );

      await sendModuleUpdateToRole(
        'teacher'
      );

      res.json({
        message:
          'Results saved',
        count:
          uploads.length
      });
    } catch (err) {
      res.status(500).json({
        message:
          err.message
      });
    }
  };

/* Student sees his/her own results */

exports.getMyResults =
  async (req, res) => {
    try {
      const student =
        await Student.findOne({
          where: {
            email:
              req.user.email
          }
        });

      if (!student) {
        return res.status(404).json({
          message:
            'Student not found'
        });
      }

      const results =
        await SubjectResult.findAll({
          where: {
            student_id:
              student.id
          },
          include: [
            {
              model: Subject,
              attributes: [
                'name'
              ]
            }
          ],
          order: [
            [
              'created_at',
              'DESC'
            ]
          ]
        });

      res.json(
        results
      );
    } catch (err) {
      res.status(500).json({
        message:
          err.message
      });
    }
  };