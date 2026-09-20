const { Op } = require('sequelize');

const Attendance = require('../models/Attendance');

const Student = require('../models/Student');

const Teacher = require('../models/Teacher');

const Class = require('../models/Class');

const User = require('../models/User');

const {
  sendNotificationToUser,
  sendNotificationToRole
} = require('./notificationController');

const {
  sendModuleUpdateToRole
} = require('../socket');

async function getTeacherByEmail(email) {
  return await Teacher.findOne({
    where: { email }
  });
}

exports.getAll = async (
  req,
  res
) => {
  try {
    const {
      page = 1,
      limit = 10,
      date,
      class_id,
      student_id,
      search
    } = req.query;

    const offset =
      (page - 1) * limit;

    const where = {};

    if (date) {
      where.date = date;
    }

    if (class_id) {
      where.class_id = class_id;
    }

    if (student_id) {
      where.student_id =
        student_id;
    }

    const include = [];

    if (true) {
      const studentWhere = {};

      if (search) {
        studentWhere[Op.or] = [
          {
            name: {
              [Op.like]:
                `%${search}%`
            }
          },
          {
            roll_no: {
              [Op.like]:
                `%${search}%`
            }
          }
        ];
      }

      include.push({
        model: Student,
        attributes: [
          'id',
          'name',
          'class',
          'roll_no'
        ],
        where:
          Object.keys(
            studentWhere
          ).length > 0
            ? studentWhere
            : undefined
      });
    }

    const {
      count,
      rows
    } =
      await Attendance.findAndCountAll(
        {
          where,
          include,
          offset:
            parseInt(offset),
          limit:
            parseInt(limit),
          order: [
            ['id', 'DESC']
          ]
        }
      );

    res.json({
      attendance: rows,
      total: count,
      page:
        parseInt(page),
      limit:
        parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({
      message:
        'Server error',
      error:
        error.message
    });
  }
};

exports.getTeacherClass =
  async (req, res) => {
    try {
      const teacher =
        await getTeacherByEmail(
          req.user.email
        );

      if (!teacher) {
        return res.json({
          classId: null,
          className: null,
          message:
            'Teacher record not found'
        });
      }

      const cls =
        await Class.findOne({
          where: {
            class_teacher_id:
              teacher.id
          }
        });

      if (cls) {
        return res.json({
          classId: cls.id,
          className:
            cls.class_name,
          message: null
        });
      }

      return res.json({
        classId: null,
        className: null,
        message:
          'You are not assigned as a class teacher. Please contact the administrator.'
      });
    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  };

exports.create = async (
  req,
  res
) => {
  try {
    const {
      student_id,
      class_id,
      date,
      status
    } = req.body;

    const [
      attendance,
      created
    ] =
      await Attendance.findOrCreate(
        {
          where: {
            student_id,
            class_id,
            date
          },
          defaults: {
            status:
              status ||
              'present'
          }
        }
      );

    if (!created) {
      attendance.status =
        status ||
        'present';

      await attendance.save();
    }

    // 🔔 Notify student if marked absent

    if (
      attendance.status ===
      'absent'
    ) {
      const student =
        await Student.findByPk(
          student_id
        );

      if (student) {
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
            `📅 You were marked absent on ${date}.`
          );
        }
      }
    }

    res.status(201).json(
      attendance
    );
  } catch (error) {
    res.status(400).json({
      message:
        'Invalid data',
      error:
        error.message
    });
  }
};

exports.bulkCreate = async (
  req,
  res
) => {
  try {
    const {
      class_id,
      date,
      records
    } = req.body;

    if (
      req.user.role ===
      'teacher'
    ) {
      const teacher =
        await getTeacherByEmail(
          req.user.email
        );

      if (!teacher) {
        return res.status(403).json({
          message:
            'Teacher not found'
        });
      }

      const cls =
        await Class.findOne({
          where: {
            class_teacher_id:
              teacher.id,
            id: class_id
          }
        });

      if (!cls) {
        return res.status(403).json({
          message:
            'You are not the class teacher of this class'
        });
      }
    }

    const promises =
      records.map(
        record =>
          Attendance.findOrCreate(
            {
              where: {
                student_id:
                  record.student_id,
                class_id,
                date
              },
              defaults: {
                status:
                  record.status ||
                  'present'
              }
            }
          ).then(
            ([att, created]) => {
              if (!created) {
                att.status =
                  record.status ||
                  'present';

                return att.save();
              }

              return att;
            }
          )
      );

    const results =
      await Promise.all(
        promises
      );

    // 🔔 Notify absent students and principal/teacher

    const classRec =
      await Class.findByPk(
        class_id
      );

    const absentStudents =
      [];

    for (
      const record of records
    ) {
      if (
        record.status ===
        'absent'
      ) {
        absentStudents.push(
          record.student_id
        );
      }
    }

    if (
      absentStudents.length >
      0
    ) {
      for (
        const studentId of absentStudents
      ) {
        const student =
          await Student.findByPk(
            studentId
          );

        if (student) {
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
              `📅 You were marked absent on ${date}.`
            );
          }
        }
      }
    }

    await sendNotificationToRole(
      'principal',
      `📅 Attendance marked for class ${classRec?.class_name || class_id} on ${date}`
    );

    await sendNotificationToRole(
      'teacher',
      `📅 Attendance marked for class ${classRec?.class_name || class_id} on ${date}`
    );

    // 🔄 Update sidebar module counts
    await sendModuleUpdateToRole(
      'principal'
    );

    await sendModuleUpdateToRole(
      'owner'
    );

    res.status(201).json(
      results
    );
  } catch (error) {
    res.status(400).json({
      message:
        'Bulk create failed',
      error:
        error.message
    });
  }
};

exports.update = async (
  req,
  res
) => {
  try {
    const attendance =
      await Attendance.findByPk(
        req.params.id
      );

    if (!attendance) {
      return res.status(404).json({
        message:
          'Not found'
      });
    }

    await attendance.update(
      req.body
    );

    res.json(
      attendance
    );
  } catch (error) {
    res.status(400).json({
      message:
        'Update failed',
      error:
        error.message
    });
  }
};

exports.remove = async (
  req,
  res
) => {
  try {
    const attendance =
      await Attendance.findByPk(
        req.params.id
      );

    if (!attendance) {
      return res.status(404).json({
        message:
          'Not found'
      });
    }

    await attendance.destroy();

    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({
      message:
        'Delete failed',
      error:
        error.message
    });
  }
};