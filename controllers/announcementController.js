const { Op } = require('sequelize');

const Announcement = require('../models/Announcement');

const Teacher = require('../models/Teacher');

const Student = require('../models/Student');

const User = require('../models/User');

const TeacherSubject = require('../models/TeacherSubject');

const Class = require('../models/Class');

const {
  sendNotificationToUser
} = require('./notificationController');

const {
  sendModuleUpdateToUser,
  sendModuleUpdateToRole
} = require('../socket');

const splitIds = (str) =>
  (str || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

exports.create = async (req, res) => {
  try {
    const {
      title,
      message,
      file_url,
      target_type,
      target_ids
    } = req.body;

    if (!title) {
      return res.status(400).json({
        message: 'Title is required'
      });
    }

    const targetIdsStr =
      Array.isArray(target_ids)
        ? target_ids.join(',')
        : (target_ids || '');

    const announcement =
      await Announcement.create({
        title,
        message,
        file_url,
        created_by:
          req.user.userId,
        target_type:
          target_type || 'all',
        target_ids:
          targetIdsStr
      });

    let affectedUserIds = [];

    if (target_type === 'all') {
      const students =
        await Student.findAll({
          attributes: ['email']
        });

      const teachers =
        await Teacher.findAll({
          attributes: ['email']
        });

      const emails = [
        ...students.map(
          s => s.email
        ),
        ...teachers.map(
          t => t.email
        )
      ];

      const users =
        await User.findAll({
          where: {
            email: {
              [Op.in]: emails
            }
          },
          attributes: ['id']
        });

      affectedUserIds =
        users.map(
          u => u.id
        );
    } else if (
      target_type === 'class' &&
      targetIdsStr
    ) {
      const classNames =
        splitIds(targetIdsStr);

      const students =
        await Student.findAll({
          where: {
            class: {
              [Op.in]: classNames
            }
          },
          attributes: ['email']
        });

      const classRecords =
        await Class.findAll({
          where: {
            class_name: {
              [Op.in]: classNames
            }
          },
          attributes: ['id']
        });

      const classIds =
        classRecords.map(
          c => c.id
        );

      let teacherEmails = [];

      if (classIds.length) {
        const teacherSubs =
          await TeacherSubject.findAll(
            {
              where: {
                class_id: {
                  [Op.in]:
                    classIds
                }
              },
              attributes: [
                'teacher_id'
              ],
              include: [
                {
                  model: Teacher,
                  attributes: [
                    'email'
                  ]
                }
              ]
            }
          );

        teacherEmails = [
          ...new Set(
            teacherSubs
              .map(
                ts =>
                  ts.Teacher
                    ?.email
              )
              .filter(Boolean)
          )
        ];
      }

      const emails = [
        ...students.map(
          s => s.email
        ),
        ...teacherEmails
      ];

      const users =
        await User.findAll({
          where: {
            email: {
              [Op.in]: emails
            }
          },
          attributes: ['id']
        });

      affectedUserIds =
        users.map(
          u => u.id
        );
    } else if (
      target_type === 'role' &&
      targetIdsStr
    ) {
      const roles =
        splitIds(targetIdsStr);

      const users =
        await User.findAll({
          where: {
            role: {
              [Op.in]: roles
            }
          },
          attributes: ['id']
        });

      affectedUserIds =
        users.map(
          u => u.id
        );
    }

    for (
      const userId of affectedUserIds
    ) {
      await sendNotificationToUser(
        userId,
        `📢 New announcement: ${title}`
      );

      // 🔄 Update sidebar module count for this user
      await sendModuleUpdateToUser(
        userId
      );
    }

    // 🔄 Update sidebar module counts for admin/affected role rooms
    await sendModuleUpdateToRole(
      'principal'
    );

    await sendModuleUpdateToRole(
      'owner'
    );

    await sendModuleUpdateToRole(
      'teacher'
    );

    await sendModuleUpdateToRole(
      'student'
    );

    res.status(201).json(
      announcement
    );
  } catch (error) {
    res.status(400).json({
      message:
        error.message
    });
  }
};

exports.getForUser = async (
  req,
  res
) => {
  try {
    const user = req.user;

    let whereCondition = {};

    if (
      user.role === 'superadmin' ||
      user.role === 'principal'
    ) {
      // Show all
    } else {
      const orConditions = [
        {
          target_type: 'all'
        }
      ];

      // Always show own announcements

      orConditions.push({
        created_by:
          user.userId
      });

      if (
        user.role === 'student'
      ) {
        const student =
          await Student.findOne({
            where: {
              email:
                user.email
            }
          });

        if (
          student &&
          student.class
        ) {
          orConditions.push({
            target_type:
              'class',
            target_ids: {
              [Op.like]:
                `%${student.class}%`
            }
          });
        }
      } else if (
        user.role === 'teacher'
      ) {
        const teacher =
          await Teacher.findOne(
            {
              where: {
                email:
                  user.email
              }
            }
          );

        if (teacher) {
          const teacherSubjects =
            await TeacherSubject.findAll(
              {
                where: {
                  teacher_id:
                    teacher.id
                },
                attributes: [
                  'class_id'
                ]
              }
            );

          const classIds = [
            ...new Set(
              teacherSubjects.map(
                ts =>
                  ts.class_id
              )
            )
          ];

          if (classIds.length) {
            const classes =
              await Class.findAll(
                {
                  where: {
                    id: {
                      [Op.in]:
                        classIds
                    }
                  },
                  attributes: [
                    'class_name'
                  ]
                }
              );

            const classNames =
              classes.map(
                c =>
                  c.class_name
              );

            const classLikes =
              classNames.map(
                cn => ({
                  target_ids: {
                    [Op.like]:
                      `%${cn}%`
                  }
                })
              );

            orConditions.push({
              target_type:
                'class',
              [Op.or]:
                classLikes
            });
          }
        }
      }

      // Role-based targeting

      orConditions.push({
        target_type:
          'role',
        target_ids: {
          [Op.like]:
            `%${user.role}%`
        }
      });

      whereCondition = {
        [Op.or]:
          orConditions
      };
    }

    const announcements =
      await Announcement.findAll({
        where:
          whereCondition,
        order: [
          [
            'created_at',
            'DESC'
          ]
        ],
        limit: 50
      });

    res.json(
      announcements
    );
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};

exports.update = async (
  req,
  res
) => {
  try {
    const announcement =
      await Announcement.findByPk(
        req.params.id
      );

    if (!announcement) {
      return res.status(404).json({
        message:
          'Not found'
      });
    }

    const user =
      req.user;

    if (
      user.role !== 'superadmin' &&
      user.role !== 'principal' &&
      announcement.created_by !==
        user.userId
    ) {
      return res.status(403).json({
        message:
          'You can only edit your own announcements'
      });
    }

    const {
      title,
      message,
      file_url,
      target_type,
      target_ids
    } = req.body;

    const targetIdsStr =
      Array.isArray(target_ids)
        ? target_ids.join(',')
        : target_ids;

    await announcement.update({
      title:
        title ||
        announcement.title,

      message:
        message !== undefined
          ? message
          : announcement.message,

      file_url:
        file_url !== undefined
          ? file_url
          : announcement.file_url,

      target_type:
        target_type ||
        announcement.target_type,

      target_ids:
        targetIdsStr ||
        announcement.target_ids
    });

    res.json(
      announcement
    );
  } catch (error) {
    res.status(400).json({
      message:
        error.message
    });
  }
};

exports.delete = async (
  req,
  res
) => {
  try {
    const announcement =
      await Announcement.findByPk(
        req.params.id
      );

    if (!announcement) {
      return res.status(404).json({
        message:
          'Not found'
      });
    }

    const user =
      req.user;

    if (
      user.role !== 'superadmin' &&
      user.role !== 'principal' &&
      announcement.created_by !==
        user.userId
    ) {
      return res.status(403).json({
        message:
          'You can only delete your own announcements'
      });
    }

    await announcement.destroy();

    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};