const { Op } = require('sequelize');
const Admission = require('../models/Admission');
const Student = require('../models/Student');
const User = require('../models/User');
const {
  sendNotificationToUser,
  sendNotificationToRole
} = require('./notificationController');

// ✅ Real-time sidebar module count updates
const {
  sendModuleUpdateToUser,
  sendModuleUpdateToRole
} = require('../socket');

exports.getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (search) {
      where[Op.or] = [
        {
          student_name: {
            [Op.like]: `%${search}%`
          }
        },
        {
          email: {
            [Op.like]: `%${search}%`
          }
        },
        {
          desired_class: {
            [Op.like]: `%${search}%`
          }
        }
      ];
    }

    if (status) {
      where.status = status;
    }

    const {
      count,
      rows
    } = await Admission.findAndCountAll({
      where,
      offset: parseInt(offset),
      limit: parseInt(limit),
      order: [['id', 'DESC']]
    });

    res.json({
      admissions: rows,
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

exports.getById = async (req, res) => {
  try {
    const admission =
      await Admission.findByPk(
        req.params.id
      );

    if (!admission) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    res.json(admission);
  } catch (error) {
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

exports.create = async (req, res) => {
  try {
    const admission =
      await Admission.create(
        req.body
      );

    // 🔔 Notify admission officer and principal
    await sendNotificationToRole(
      'admission_officer',
      `📨 New admission application from ${admission.student_name}`
    );

    await sendNotificationToRole(
      'principal',
      `📨 New admission application from ${admission.student_name}`
    );

    // ✅ Update sidebar admission counts in real-time
    await sendModuleUpdateToRole(
      'admission_officer'
    );

    await sendModuleUpdateToRole(
      'principal'
    );

    await sendModuleUpdateToRole(
      'owner'
    );

    res.status(201).json(
      admission
    );
  } catch (error) {
    res.status(400).json({
      message: 'Invalid data',
      error: error.message
    });
  }
};

exports.update = async (req, res) => {
  try {
    const admission =
      await Admission.findByPk(
        req.params.id
      );

    if (!admission) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    await admission.update(
      req.body
    );

    res.json(admission);
  } catch (error) {
    res.status(400).json({
      message: 'Update failed',
      error: error.message
    });
  }
};

exports.remove = async (req, res) => {
  try {
    const admission =
      await Admission.findByPk(
        req.params.id
      );

    if (!admission) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    await admission.destroy();

    // ✅ Update sidebar admission counts after deletion
    await sendModuleUpdateToRole(
      'admission_officer'
    );

    await sendModuleUpdateToRole(
      'principal'
    );

    await sendModuleUpdateToRole(
      'owner'
    );

    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({
      message: 'Delete failed',
      error: error.message
    });
  }
};

exports.approve = async (req, res) => {
  try {
    const admission =
      await Admission.findByPk(
        req.params.id
      );

    if (!admission) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    if (
      admission.status !==
      'pending'
    ) {
      return res.status(400).json({
        message:
          'Only pending applications can be approved'
      });
    }

    // ── Generate roll number ──
    const count =
      await Student.count({
        where: {
          class:
            admission.desired_class,
          is_active: true
        }
      });

    const rollNo =
      String(count + 1).padStart(
        2,
        '0'
      );

    const studentData = {
      name:
        admission.student_name,
      email:
        admission.email,
      phone:
        admission.phone,
      dob:
        admission.dob,
      gender:
        admission.gender,
      address:
        admission.address,
      class:
        admission.desired_class,
      roll_no:
        rollNo,
      parent_name:
        admission.parent_name,
      parent_phone:
        admission.parent_phone,
      parent_email:
        admission.parent_email,
      admission_date:
        new Date()
          .toISOString()
          .slice(
            0,
            10
          )
    };

    const student =
      await Student.create(
        studentData
      );

    // Create user account using password from admission form
    let studentUser = null;
    let generatedPassword = null;

    if (admission.email) {
      const bcrypt =
        require('bcryptjs');

      const crypto =
        require('crypto');

      const plainPassword =
        admission.password ||
        crypto.randomBytes(
          6
        ).toString('hex');

      generatedPassword =
        plainPassword;

      const hashedPassword =
        await bcrypt.hash(
          plainPassword,
          10
        );

      const [
        user,
        created
      ] =
        await User.findOrCreate({
          where: {
            email:
              admission.email
          },
          defaults: {
            name:
              admission.student_name,
            password:
              hashedPassword,
            role:
              'student'
          }
        });

      if (!created) {
        generatedPassword =
          null;
      }

      studentUser = user;
    }

    // ✅ Create parent user account if parent_email and parent_password provided
    let parentUser = null;
    let parentGeneratedPassword =
      null;

    if (
      admission.parent_email &&
      admission.parent_password
    ) {
      const bcrypt =
        require('bcryptjs');

      const hashedParentPassword =
        await bcrypt.hash(
          admission.parent_password,
          10
        );

      const [
        parent,
        parentCreated
      ] =
        await User.findOrCreate({
          where: {
            email:
              admission.parent_email
          },
          defaults: {
            name:
              admission.parent_name ||
              'Parent',
            password:
              hashedParentPassword,
            role:
              'parent'
          }
        });

      if (parentCreated) {
        parentGeneratedPassword =
          admission.parent_password;
      }

      parentUser = parent;
    }

    admission.status =
      'approved';

    await admission.save();

    // 🔔 Notify parent if account created
    if (
      parentUser &&
      parentGeneratedPassword
    ) {
      await sendNotificationToUser(
        parentUser.id,
        `✅ Your parent account has been created. Email: ${admission.parent_email}, Password: ${parentGeneratedPassword}`
      );

      // ✅ Refresh module counts for newly created parent account
      await sendModuleUpdateToUser(
        parentUser.id
      );
    }

    // 🔔 Notify admission officer and principal
    await sendNotificationToRole(
      'admission_officer',
      `✅ Admission approved for ${admission.student_name}`
    );

    await sendNotificationToRole(
      'principal',
      `✅ Admission approved for ${admission.student_name}`
    );

    // ✅ Update admission module counts in real-time
    await sendModuleUpdateToRole(
      'admission_officer'
    );

    await sendModuleUpdateToRole(
      'principal'
    );

    await sendModuleUpdateToRole(
      'owner'
    );

    // ✅ Refresh student sidebar counts if account exists
    if (studentUser) {
      await sendModuleUpdateToUser(
        studentUser.id
      );
    }

    res.json({
      message:
        'Student approved and enrolled',
      student,
      admission,
      studentAccount:
        studentUser
          ? {
              email:
                studentUser.email,
              generatedPassword
            }
          : null,
      parentAccount:
        parentUser
          ? {
              email:
                parentUser.email,
              generatedPassword:
                parentGeneratedPassword
            }
          : null
    });
  } catch (error) {
    res.status(500).json({
      message: 'Approval failed',
      error: error.message
    });
  }
};

exports.reject = async (req, res) => {
  try {
    const admission =
      await Admission.findByPk(
        req.params.id
      );

    if (!admission) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    if (
      admission.status !==
      'pending'
    ) {
      return res.status(400).json({
        message:
          'Only pending applications can be rejected'
      });
    }

    admission.status =
      'rejected';

    await admission.save();

    // 🔔 Notify admission officer and principal
    await sendNotificationToRole(
      'admission_officer',
      `❌ Admission rejected for ${admission.student_name}`
    );

    await sendNotificationToRole(
      'principal',
      `❌ Admission rejected for ${admission.student_name}`
    );

    // ✅ Update admission module counts in real-time
    await sendModuleUpdateToRole(
      'admission_officer'
    );

    await sendModuleUpdateToRole(
      'principal'
    );

    await sendModuleUpdateToRole(
      'owner'
    );

    res.json({
      message:
        'Application rejected',
      admission
    });
  } catch (error) {
    res.status(500).json({
      message:
        'Rejection failed',
      error: error.message
    });
  }
};