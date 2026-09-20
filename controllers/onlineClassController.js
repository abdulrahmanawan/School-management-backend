const { Op } = require('sequelize');

const OnlineClass = require('../models/OnlineClass');

const Teacher = require('../models/Teacher');

const Class = require('../models/Class');

const Student = require('../models/Student');

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

/* Helper: get teacher id from logged-in user */

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
          timetableRows
            .map(
              t =>
                t.class_id
            )
            .filter(Boolean)
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
          ],
          order: [
            [
              'class_name',
              'ASC'
            ]
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

/* Create online class (class or staff meeting) */

exports.create =
  async (req, res) => {
    try {
      const user =
        req.user;

      const teacherId =
        await getTeacherId(
          user
        );

      const {
        title,
        class_id,
        meeting_type,
        scheduled_date,
        start_time,
        end_time,
        meet_link,
        description,
        invited_staff
      } = req.body;

      if (
        !title ||
        !scheduled_date ||
        !start_time ||
        !end_time ||
        !meet_link
      ) {
        return res.status(400).json({
          message:
            'Missing required fields'
        });
      }

      /* Staff meetings only by principal/superadmin */

      if (
        meeting_type ===
        'staff'
      ) {
        if (
          user.role !==
            'principal' &&
          user.role !==
            'superadmin'
        ) {
          return res.status(403).json({
            message:
              'Only principal can create staff meetings'
          });
        }

        if (class_id) {
          return res.status(400).json({
            message:
              'Staff meetings cannot be linked to a class'
          });
        }

        if (
          !invited_staff ||
          invited_staff.length ===
            0
        ) {
          return res.status(400).json({
            message:
              'Please select staff members'
          });
        }
      } else {
        /* Class meeting must have class_id */

        if (!class_id) {
          return res.status(400).json({
            message:
              'Class is required for class meetings'
          });
        }

        /* Teacher must teach that class */

        if (
          user.role ===
          'teacher'
        ) {
          if (!teacherId) {
            return res.status(403).json({
              message:
                'Teacher record not found'
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

          const classIds =
            timetableRows.map(
              t =>
                t.class_id
            );

          if (
            !classIds.includes(
              Number(
                class_id
              )
            )
          ) {
            return res.status(403).json({
              message:
                'You do not teach this class'
            });
          }
        }
      }

      /* Convert invited_staff array to string for storage */

      let invitedStaffString =
        null;

      if (
        meeting_type ===
        'staff'
      ) {
        if (
          invited_staff ===
            'all' ||
          invited_staff.includes(
            'all'
          )
        ) {
          invitedStaffString =
            'all';
        } else {
          invitedStaffString =
            Array.isArray(
              invited_staff
            )
              ? invited_staff.join(
                  ','
                )
              : String(
                  invited_staff
                );
        }
      }

      const onlineClass =
        await OnlineClass.create(
          {
            title,
            class_id:
              meeting_type ===
              'staff'
                ? null
                : class_id,
            teacher_id:
              teacherId || null,
            meeting_type,
            scheduled_date,
            start_time,
            end_time,
            meet_link,
            description:
              description ||
              '',
            invited_staff:
              invitedStaffString
          }
        );

      /* 🔔 Notify users */

      if (
        meeting_type ===
        'class'
      ) {
        const classRec =
          await Class.findByPk(
            class_id
          );

        if (classRec) {
          const students =
            await Student.findAll({
              where: {
                class:
                  classRec.class_name,
                is_active:
                  true
              },
              attributes: [
                'email'
              ]
            });

          for (const student of students) {
            const userRec =
              await User.findOne(
                {
                  where: {
                    email:
                      student.email
                  }
                }
              );

            if (userRec) {
              await sendNotificationToUser(
                userRec.id,
                `🎥 Online class "${title}" scheduled for ${scheduled_date} ${start_time}`
              );

              /* 🔄 Update student's online class count */

              await sendModuleUpdateToUser(
                userRec.id
              );
            }
          }
        }

        /* 🔄 Update admin counts */

        await sendModuleUpdateToRole(
          'principal'
        );

        await sendModuleUpdateToRole(
          'owner'
        );
      } else if (
        meeting_type ===
        'staff'
      ) {
        const staffIds =
          invitedStaffString ===
          'all'
            ? (
                await Teacher.findAll()
              ).map(
                t => t.id
              )
            : invitedStaffString
                .split(',')
                .map(
                  id =>
                    parseInt(
                      id.trim()
                    )
                );

        for (const teacherId of staffIds) {
          const teacher =
            await Teacher.findByPk(
              teacherId
            );

          if (teacher) {
            const userRec =
              await User.findOne({
                where: {
                  email:
                    teacher.email
                }
              });

            if (userRec) {
              await sendNotificationToUser(
                userRec.id,
                `🎥 Staff meeting "${title}" scheduled for ${scheduled_date} ${start_time}`
              );

              /* 🔄 Update teacher's online class count */

              await sendModuleUpdateToUser(
                userRec.id
              );
            }
          }
        }

        await sendNotificationToRole(
          'principal',
          `🎥 Staff meeting "${title}" created`
        );

        /* 🔄 Update admin counts */

        await sendModuleUpdateToRole(
          'principal'
        );

        await sendModuleUpdateToRole(
          'owner'
        );
      }

      res.status(201).json(
        onlineClass
      );
    } catch (err) {
      res.status(400).json({
        message:
          err.message
      });
    }
  };

/* List online classes for teacher/admin */

exports.getAll =
  async (req, res) => {
    try {
      const user =
        req.user;

      let where = {};

      if (
        user.role ===
          'principal' ||
        user.role ===
          'superadmin'
      ) {
        /* see all */
      } else if (
        user.role ===
        'teacher'
      ) {
        const teacherId =
          await getTeacherId(
            user
          );

        if (!teacherId) {
          return res.json({
            classes: []
          });
        }

        where = {
          [Op.or]: [
            {
              teacher_id:
                teacherId,
              meeting_type:
                'class'
            },
            {
              meeting_type:
                'staff',
              [Op.or]: [
                {
                  invited_staff:
                    'all'
                },
                {
                  invited_staff: {
                    [Op.like]: `%${teacherId}%`
                  }
                }
              ]
            }
          ]
        };
      } else {
        return res.status(403).json({
          message:
            'Not allowed'
        });
      }

      const classes =
        await OnlineClass.findAll(
          {
            where,
            include: [
              {
                model: Class,
                attributes: [
                  'id',
                  'class_name'
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
            order: [
              [
                'scheduled_date',
                'DESC'
              ],
              [
                'start_time',
                'DESC'
              ]
            ]
          }
        );

      res.json({
        classes
      });
    } catch (err) {
      res.status(500).json({
        message:
          err.message
      });
    }
  };

/* Delete online class (only creator or admin can delete) */

exports.remove =
  async (req, res) => {
    try {
      const onlineClass =
        await OnlineClass.findByPk(
          req.params.id
        );

      if (!onlineClass) {
        return res.status(404).json({
          message:
            'Not found'
        });
      }

      const user =
        req.user;

      if (
        user.role !==
          'superadmin' &&
        user.role !==
          'principal' &&
        onlineClass.teacher_id !==
          user.userId
      ) {
        return res.status(403).json({
          message:
            'You can only delete your own classes'
        });
      }

      await onlineClass.destroy();

      /* 🔔 Notify affected users */

      if (
        onlineClass.meeting_type ===
          'class' &&
        onlineClass.class_id
      ) {
        const classRec =
          await Class.findByPk(
            onlineClass.class_id
          );

        if (classRec) {
          const students =
            await Student.findAll({
              where: {
                class:
                  classRec.class_name,
                is_active:
                  true
              }
            });

          for (const student of students) {
            const userRec =
              await User.findOne({
                where: {
                  email:
                    student.email
                }
              });

            if (userRec) {
              await sendNotificationToUser(
                userRec.id,
                `❌ Online class "${onlineClass.title}" has been cancelled.`
              );

              /* 🔄 Update student's online class count */

              await sendModuleUpdateToUser(
                userRec.id
              );
            }
          }
        }
      } else if (
        onlineClass.meeting_type ===
        'staff'
      ) {
        const staffIds =
          onlineClass.invited_staff ===
          'all'
            ? (
                await Teacher.findAll()
              ).map(
                t => t.id
              )
            : onlineClass.invited_staff
                .split(',')
                .map(
                  id =>
                    parseInt(
                      id
                    )
                );

        for (const teacherId of staffIds) {
          const teacher =
            await Teacher.findByPk(
              teacherId
            );

          if (teacher) {
            const userRec =
              await User.findOne({
                where: {
                  email:
                    teacher.email
                }
              });

            if (userRec) {
              await sendNotificationToUser(
                userRec.id,
                `❌ Staff meeting "${onlineClass.title}" cancelled.`
              );

              /* 🔄 Update teacher's online class count */

              await sendModuleUpdateToUser(
                userRec.id
              );
            }
          }
        }
      }

      /* 🔄 Update admin counts */

      await sendModuleUpdateToRole(
        'principal'
      );

      await sendModuleUpdateToRole(
        'owner'
      );

      res.sendStatus(
        204
      );
    } catch (err) {
      res.status(500).json({
        message:
          err.message
      });
    }
  };

/* Get online classes for the logged-in student
   (only class meetings for their class) */

exports.getStudentClasses =
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

      const classRec =
        await Class.findOne({
          where: {
            class_name:
              student.class
          }
        });

      if (!classRec) {
        return res.json({
          classes: []
        });
      }

      const classes =
        await OnlineClass.findAll({
          where: {
            class_id:
              classRec.id,
            meeting_type:
              'class'
          },
          include: [
            {
              model: Class,
              attributes: [
                'id',
                'class_name'
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
          order: [
            [
              'scheduled_date',
              'DESC'
            ],
            [
              'start_time',
              'DESC'
            ]
          ]
        });

      res.json({
        classes
      });
    } catch (err) {
      res.status(500).json({
        message:
          err.message
      });
    }
  };