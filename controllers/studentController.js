const { Op } = require('sequelize');

const sequelize = require('sequelize');

const Student = require('../models/Student');

const Guardian = require('../models/Guardian');

const StudentGuardian = require('../models/StudentGuardian');

const Attendance = require('../models/Attendance');

const Result = require('../models/Result');

const Exam = require('../models/Exam');

const User = require('../models/User');


// =========================================================
// GET ALL STUDENTS
// =========================================================

exports.getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      class: classFilter,
      is_active
    } = req.query;

    const offset =
      (page - 1) * limit;

    const where = {};

    if (search) {
      where[Op.or] = [
        {
          name: {
            [Op.like]: `%${search}%`
          }
        },
        {
          email: {
            [Op.like]: `%${search}%`
          }
        },
        {
          class: {
            [Op.like]: `%${search}%`
          }
        },
        {
          roll_no: {
            [Op.like]: `%${search}%`
          }
        }
      ];
    }

    // Parse is_active only if actually provided
    if (
      is_active !== undefined &&
      is_active !== ''
    ) {
      where.is_active =
        is_active === 'true';
    }

    // Class filter
    if (classFilter) {
      where.class = classFilter;
    }

    const {
      count,
      rows
    } = await Student.findAndCountAll({
      where,
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [
        ['id', 'DESC']
      ]
    });

    res.json({
      students: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};


// =========================================================
// GET SINGLE STUDENT WITH GUARDIANS
// =========================================================

exports.getById = async (req, res) => {
  try {
    const student =
      await Student.findByPk(
        req.params.id,
        {
          include: [
            {
              model: Guardian,
              through: {
                attributes: [
                  'is_primary'
                ]
              },
              as: 'guardians'
            }
          ]
        }
      );

    if (!student) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};


// =========================================================
// CREATE STUDENT
// Supports:
// student password
// parent name
// parent phone
// parent email
// parent password
// guardians
// =========================================================

exports.create = async (req, res) => {
  try {
    const {
      guardians,
      password,
      parent_password,
      ...studentData
    } = req.body;


    // -------------------------------------------------------
    // Generate roll number if not provided
    // -------------------------------------------------------

    if (!studentData.roll_no) {
      const count =
        await Student.count({
          where: {
            class:
              studentData.class
          }
        });

      studentData.roll_no =
        String(
          count + 1
        ).padStart(
          2,
          '0'
        );
    } else {
      // Check duplicate roll number
      const existing =
        await Student.findOne({
          where: {
            class:
              studentData.class,
            roll_no:
              studentData.roll_no
          }
        });

      if (existing) {
        return res.status(400).json({
          message:
            `Roll number ${studentData.roll_no} already exists in class ${studentData.class}`
        });
      }
    }


    // -------------------------------------------------------
    // Create student
    // -------------------------------------------------------

    const student =
      await Student.create(
        studentData
      );


    // -------------------------------------------------------
    // Create student user account
    // -------------------------------------------------------

    let studentGeneratedPassword =
      null;

    if (studentData.email) {
      const bcrypt =
        require('bcryptjs');

      const crypto =
        require('crypto');

      const plainPassword =
        password ||
        crypto
          .randomBytes(6)
          .toString('hex');

      const hashedPassword =
        await bcrypt.hash(
          plainPassword,
          10
        );

      const [
        studentUser,
        studentUserCreated
      ] =
        await User.findOrCreate({
          where: {
            email:
              studentData.email
          },
          defaults: {
            name:
              studentData.name,
            password:
              hashedPassword,
            role: 'student'
          }
        });

      if (studentUserCreated) {
        studentGeneratedPassword =
          plainPassword;
      }

      /*
       * Keep this variable referenced so the account creation
       * remains explicit and does not trigger lint warnings.
       */
      void studentUser;
    }


    // -------------------------------------------------------
    // Create / update parent user account
    // -------------------------------------------------------

    let parentGeneratedPassword =
      null;

    if (
      studentData.parent_email
    ) {
      const bcrypt =
        require('bcryptjs');

      const crypto =
        require('crypto');

      let plainParentPassword =
        parent_password;

      /*
       * Generate password automatically if parent email is
       * provided but password was not supplied.
       */
      if (!plainParentPassword) {
        plainParentPassword =
          crypto
            .randomBytes(6)
            .toString('hex');
      }

      const hashedParentPassword =
        await bcrypt.hash(
          plainParentPassword,
          10
        );

      const [
        parentUser,
        parentCreated
      ] =
        await User.findOrCreate({
          where: {
            email:
              studentData.parent_email
          },
          defaults: {
            name:
              studentData.parent_name ||
              'Parent',
            password:
              hashedParentPassword,
            role: 'parent'
          }
        });

      if (parentCreated) {
        parentGeneratedPassword =
          plainParentPassword;
      }

      /*
       * If the parent account already exists and a password was
       * supplied, update the password and name.
       */
      if (!parentCreated) {
        parentUser.name =
          studentData.parent_name ||
          parentUser.name;

        if (parent_password) {
          parentUser.password =
            hashedParentPassword;
        }

        await parentUser.save();
      }
    }


    // -------------------------------------------------------
    // Create guardian records
    // -------------------------------------------------------

    if (
      guardians &&
      Array.isArray(
        guardians
      )
    ) {
      for (
        const g of guardians
      ) {
        const [guardian] =
          await Guardian.findOrCreate({
            where: {
              email:
                g.email ||
                g.phone
            },
            defaults: {
              name:
                g.name,
              relation:
                g.relation,
              phone:
                g.phone,
              email:
                g.email,
              address:
                g.address
            }
          });

        await StudentGuardian.create({
          student_id:
            student.id,
          guardian_id:
            guardian.id,
          is_primary:
            g.is_primary ||
            false
        });
      }
    }


    // -------------------------------------------------------
    // Response
    // -------------------------------------------------------

    res.status(201).json({
      student,
      studentAccount: studentData.email
        ? {
            email:
              studentData.email,
            generatedPassword:
              studentGeneratedPassword
          }
        : null,
      parentAccount: studentData.parent_email
        ? {
            email:
              studentData.parent_email,
            generatedPassword:
              parentGeneratedPassword
          }
        : null
    });

  } catch (error) {
    res.status(400).json({
      message: 'Invalid data',
      error: error.message
    });
  }
};


// =========================================================
// UPDATE STUDENT
// Supports parent fields + parent account
// =========================================================

exports.update = async (req, res) => {
  try {
    const student =
      await Student.findByPk(
        req.params.id
      );

    if (!student) {
      return res.status(404).json({
        message: 'Not found'
      });
    }


    // -------------------------------------------------------
    // Extract fields
    // -------------------------------------------------------

    const {
      name,
      email,
      phone,
      dob,
      gender,
      address,
      class: className,
      roll_no,
      parent_name,
      parent_phone,
      parent_email,
      parent_password,
      is_active
    } = req.body;


    // -------------------------------------------------------
    // Roll number duplicate check
    // -------------------------------------------------------

    if (
      roll_no ||
      className
    ) {
      const newRoll =
        roll_no ||
        student.roll_no;

      const newClass =
        className ||
        student.class;

      const existing =
        await Student.findOne({
          where: {
            class:
              newClass,
            roll_no:
              newRoll,
            id: {
              [Op.ne]:
                student.id
            }
          }
        });

      if (existing) {
        return res.status(400).json({
          message:
            `Roll number ${newRoll} already exists in class ${newClass}`
        });
      }
    }


    // -------------------------------------------------------
    // Update student fields
    // -------------------------------------------------------

    if (name) {
      student.name =
        name;
    }

    if (
      email !== undefined
    ) {
      student.email =
        email;
    }

    if (
      phone !== undefined
    ) {
      student.phone =
        phone;
    }

    if (
      dob !== undefined
    ) {
      student.dob =
        dob;
    }

    if (
      gender !== undefined
    ) {
      student.gender =
        gender;
    }

    if (
      address !== undefined
    ) {
      student.address =
        address;
    }

    if (
      className !== undefined
    ) {
      student.class =
        className;
    }

    if (
      roll_no !== undefined
    ) {
      student.roll_no =
        roll_no;
    }

    if (
      parent_name !== undefined
    ) {
      student.parent_name =
        parent_name;
    }

    if (
      parent_phone !== undefined
    ) {
      student.parent_phone =
        parent_phone;
    }

    if (
      parent_email !== undefined
    ) {
      student.parent_email =
        parent_email;
    }

    if (
      is_active !== undefined
    ) {
      student.is_active =
        is_active === true ||
        is_active === 'true';
    }


    // -------------------------------------------------------
    // Save student
    // -------------------------------------------------------

    await student.save();


    // -------------------------------------------------------
    // Update parent User account
    // -------------------------------------------------------

    if (
      parent_email !== undefined ||
      parent_name !== undefined ||
      parent_password !== undefined
    ) {
      const bcrypt =
        require('bcryptjs');

      /*
       * Determine current/new parent email.
       */
      const finalParentEmail =
        parent_email !== undefined
          ? parent_email
          : student.parent_email;

      if (finalParentEmail) {
        let parentUser =
          await User.findOne({
            where: {
              email:
                finalParentEmail
            }
          });

        /*
         * Create parent account if it doesn't exist.
         */
        if (!parentUser) {
          const passwordToUse =
            parent_password ||
            require('crypto')
              .randomBytes(6)
              .toString('hex');

          const hashedPassword =
            await bcrypt.hash(
              passwordToUse,
              10
            );

          parentUser =
            await User.create({
              name:
                student.parent_name ||
                'Parent',
              email:
                finalParentEmail,
              password:
                hashedPassword,
              role:
                'parent'
            });
        } else {
          /*
           * Update parent name.
           */
          if (
            parent_name !== undefined
          ) {
            parentUser.name =
              parent_name ||
              parentUser.name;
          }

          /*
           * Update password only when supplied.
           */
          if (
            parent_password
          ) {
            parentUser.password =
              await bcrypt.hash(
                parent_password,
                10
              );
          }

          /*
           * Make sure role remains parent.
           */
          if (
            parentUser.role !==
            'parent'
          ) {
            parentUser.role =
              'parent';
          }

          await parentUser.save();
        }
      }
    }


    res.json(student);

  } catch (error) {
    res.status(400).json({
      message:
        'Update failed',
      error: error.message
    });
  }
};


// =========================================================
// PROMOTE SINGLE STUDENT
// =========================================================

exports.promote = async (req, res) => {
  try {
    const { newClass } =
      req.body;

    const student =
      await Student.findByPk(
        req.params.id
      );

    if (!student) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    await student.update({
      class:
        newClass,
      is_active:
        true
    });

    res.json(student);

  } catch (error) {
    res.status(400).json({
      message:
        'Promotion failed',
      error: error.message
    });
  }
};


// =========================================================
// BULK PROMOTE
// =========================================================

exports.bulkPromote = async (
  req,
  res
) => {
  try {
    const {
      fromClass,
      toClass
    } = req.body;

    const [
      affectedCount
    ] = await Student.update(
      {
        class:
          toClass
      },
      {
        where: {
          class:
            fromClass,
          is_active:
            true
        }
      }
    );

    res.json({
      message:
        `${affectedCount} students promoted`,
      count:
        affectedCount
    });

  } catch (error) {
    res.status(400).json({
      message:
        'Bulk promotion failed',
      error:
        error.message
    });
  }
};


// =========================================================
// DELETE STUDENT
// =========================================================

exports.remove = async (req, res) => {
  try {
    const student =
      await Student.findByPk(
        req.params.id
      );

    if (!student) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    /*
     * Destroy the student.
     * Attendance cascade remains handled by the existing
     * database/model association.
     */
    await student.destroy();

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


// =========================================================
// GET DETAILED STUDENT REPORT
// =========================================================

exports.getReport = async (
  req,
  res
) => {
  try {
    const student =
      await Student.findByPk(
        req.params.id
      );

    if (!student) {
      return res.status(404).json({
        message:
          'Student not found'
      });
    }


    // -------------------------------------------------------
    // Attendance
    // -------------------------------------------------------

    const totalAttendance =
      await Attendance.count({
        where: {
          student_id:
            student.id
        }
      });

    const presentAttendance =
      await Attendance.count({
        where: {
          student_id:
            student.id,
          status:
            'present'
        }
      });

    const attendancePercentage =
      totalAttendance > 0
        ? (
            (presentAttendance /
              totalAttendance) *
            100
          ).toFixed(1)
        : 100;


    // -------------------------------------------------------
    // Latest results
    // -------------------------------------------------------

    const results =
      await Result.findAll({
        where: {
          student_id:
            student.id
        },
        include: [
          {
            model:
              Exam,
            attributes: [
              'exam_name',
              'total_marks'
            ]
          }
        ],
        order: [
          ['id', 'DESC']
        ],
        limit: 5
      });

    const latestResult =
      results.length > 0
        ? results[0]
        : null;


    // -------------------------------------------------------
    // Report response
    // -------------------------------------------------------

    const report = {
      student: {
        id:
          student.id,
        name:
          student.name,
        class:
          student.class,
        roll_no:
          student.roll_no,
        email:
          student.email,
        phone:
          student.phone,
        parent_name:
          student.parent_name,
        parent_phone:
          student.parent_phone,
        parent_email:
          student.parent_email,
        address:
          student.address,
        board_affiliation:
          student.board_affiliation
      },

      attendance: {
        total:
          totalAttendance,
        present:
          presentAttendance,
        percentage:
          attendancePercentage
      },

      latestResults:
        results.map(
          r => ({
            exam:
              r.Exam
                ?.exam_name,
            marks:
              r.marks_obtained,
            total:
              r.Exam
                ?.total_marks,
            grade:
              r.grade
          })
        ),

      overallGrade:
        latestResult
          ? latestResult.grade
          : 'N/A'
    };

    res.json(report);

  } catch (error) {
    res.status(500).json({
      message:
        'Server error',
      error:
        error.message
    });
  }
};


// =========================================================
// ATTENDANCE SUMMARY
// =========================================================

exports.attendanceSummary = async (
  req,
  res
) => {
  try {
    const ids =
      req.query.ids
        ? req.query.ids.split(',')
        : [];

    const summary = {};

    if (ids.length === 0) {
      return res.json(
        summary
      );
    }


    // -------------------------------------------------------
    // Total attendance
    // -------------------------------------------------------

    const attendanceCounts =
      await Attendance.findAll({
        attributes: [
          'student_id',
          [
            sequelize.fn(
              'COUNT',
              sequelize.col(
                'id'
              )
            ),
            'total'
          ]
        ],
        where: {
          student_id: {
            [Op.in]:
              ids
          }
        },
        group: [
          'student_id'
        ],
        raw: true
      });


    // -------------------------------------------------------
    // Present attendance
    // -------------------------------------------------------

    const presentCounts =
      await Attendance.findAll({
        attributes: [
          'student_id',
          [
            sequelize.fn(
              'COUNT',
              sequelize.col(
                'id'
              )
            ),
            'present'
          ]
        ],
        where: {
          student_id: {
            [Op.in]:
              ids
          },
          status:
            'present'
        },
        group: [
          'student_id'
        ],
        raw: true
      });


    // -------------------------------------------------------
    // Calculate percentage
    // -------------------------------------------------------

    ids.forEach(
      id => {
        const totalRec =
          attendanceCounts.find(
            c =>
              c.student_id ==
              id
          );

        const presentRec =
          presentCounts.find(
            c =>
              c.student_id ==
              id
          );

        const total =
          totalRec
            ? parseInt(
                totalRec.total
              )
            : 0;

        const present =
          presentRec
            ? parseInt(
                presentRec.present
              )
            : 0;

        const percent =
          total > 0
            ? (
                (present /
                  total) *
                100
              ).toFixed(1)
            : null;

        summary[id] =
          percent;
      }
    );

    res.json(
      summary
    );

  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};


// =========================================================
// LOGGED-IN STUDENT PROFILE
// =========================================================

exports.myProfile = async (
  req,
  res
) => {
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
          'Student record not found'
      });
    }

    res.json(student);

  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};