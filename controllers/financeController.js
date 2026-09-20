const { Op } = require('sequelize');
const FeeStructure = require('../models/FeeStructure');
const FeeStructureItem = require('../models/FeeStructureItem');
const Invoice = require('../models/Invoice');
const InvoiceItem = require('../models/InvoiceItem');
const Payment = require('../models/Payment');
const FinanceSetting = require('../models/FinanceSetting');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const User = require('../models/User');
const Timetable = require('../models/Timetable');
const { sendNotificationToUser, sendNotificationToRole } = require('./notificationController');

function generateInvoiceNumber() {
  const timestamp = Date.now().toString().slice(-8);
  return `INV-${timestamp}`;
}

async function getSubjectsForClass(classId) {
  const rows = await Timetable.findAll({
    where: { class_id: classId },
    attributes: ['subject_id'],
    raw: true,
  });
  const subjectIds = [...new Set(rows.map(r => r.subject_id).filter(Boolean))];
  return await Subject.findAll({ where: { id: { [Op.in]: subjectIds } }, attributes: ['id', 'name'] });
}

// ─── Fee Structures ───
exports.getFeeStructures = async (req, res) => {
  try {
    const { class_id } = req.query;
    const where = {};
    if (class_id) where.class_id = class_id;

    const structures = await FeeStructure.findAll({
      where,
      include: [
        { model: Class, attributes: ['id', 'class_name'] },
        { model: FeeStructureItem, as: 'items' },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(structures);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createFeeStructure = async (req, res) => {
  try {
    const { class_id, items } = req.body;
    if (!class_id || !items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: 'Class and at least one item required' });

    for (const item of items) {
      if (!item.description || !item.amount || parseFloat(item.amount) <= 0)
        return res.status(400).json({ message: 'Each item needs description and amount > 0' });
    }

    const structure = await FeeStructure.create({ class_id });
    for (const item of items) {
      await FeeStructureItem.create({
        fee_structure_id: structure.id,
        item_type: item.type || 'custom',
        subject_id: item.subject_id || null,
        description: item.description,
        amount: item.amount,
      });
    }

    const created = await FeeStructure.findByPk(structure.id, {
      include: [{ model: FeeStructureItem, as: 'items' }],
    });

    await sendNotificationToRole('principal', `📋 New fee structure created for class ${created.Class?.class_name}`);
    await sendNotificationToRole('accountant', `📋 New fee structure created for class ${created.Class?.class_name}`);

    res.status(201).json(created);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.updateFeeStructure = async (req, res) => {
  try {
    const structure = await FeeStructure.findByPk(req.params.id);
    if (!structure) return res.status(404).json({ message: 'Not found' });

    const { class_id, items } = req.body;
    if (class_id) structure.class_id = class_id;
    await structure.save();

    if (items && Array.isArray(items)) {
      await FeeStructureItem.destroy({ where: { fee_structure_id: structure.id } });
      for (const item of items) {
        await FeeStructureItem.create({
          fee_structure_id: structure.id,
          item_type: item.type || 'custom',
          subject_id: item.subject_id || null,
          description: item.description,
          amount: item.amount,
        });
      }
    }

    const updated = await FeeStructure.findByPk(structure.id, {
      include: [{ model: FeeStructureItem, as: 'items' }],
    });

    await sendNotificationToRole('principal', `📋 Fee structure updated for class ${updated.Class?.class_name}`);
    await sendNotificationToRole('accountant', `📋 Fee structure updated for class ${updated.Class?.class_name}`);

    res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.deleteFeeStructure = async (req, res) => {
  try {
    const structure = await FeeStructure.findByPk(req.params.id);
    if (!structure) return res.status(404).json({ message: 'Not found' });
    await FeeStructureItem.destroy({ where: { fee_structure_id: structure.id } });
    await structure.destroy();

    await sendNotificationToRole('principal', `🗑️ Fee structure deleted for class ${structure.Class?.class_name}`);
    await sendNotificationToRole('accountant', `🗑️ Fee structure deleted for class ${structure.Class?.class_name}`);

    res.sendStatus(204);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getClassSubjects = async (req, res) => {
  try {
    const subjects = await getSubjectsForClass(req.params.classId);
    res.json(subjects);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─── Invoices ───
exports.getInvoices = async (req, res) => {
  try {
    const { student_id, class_id, month, status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (student_id) where.student_id = student_id;
    if (class_id) where.class_id = class_id;
    if (month) where.month = month;
    if (status) where.status = status;

    const offset = (page - 1) * limit;
    const { count, rows } = await Invoice.findAndCountAll({
      where,
      include: [
        { model: Student, attributes: ['id', 'name', 'roll_no', 'class'] },
        { model: Class, attributes: ['id', 'class_name'] },
        { model: InvoiceItem, as: 'items' },
      ],
      offset,
      limit: parseInt(limit),
      order: [['created_at', 'DESC']],
    });
    res.json({ invoices: rows, total: count, page, limit });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        { model: Student, attributes: ['id', 'name', 'roll_no', 'class'] },
        { model: Class, attributes: ['id', 'class_name'] },
        { model: InvoiceItem, as: 'items' },
      ],
    });
    if (!invoice) return res.status(404).json({ message: 'Not found' });

    if (req.user.role === 'student' || req.user.role === 'parent') {
      const student = await Student.findOne({ where: { email: req.user.email } });
      if (!student || invoice.student_id !== student.id)
        return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(invoice);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ✅ Get my invoices (student/parent)
exports.getMyInvoices = async (req, res) => {
  try {
    let student = null;
    if (req.user.role === 'student') {
      student = await Student.findOne({ where: { email: req.user.email } });
    } else if (req.user.role === 'parent') {
      student = await Student.findOne({ where: { parent_email: req.user.email } });
    }
    if (!student) return res.status(404).json({ message: 'Student record not found' });

    const invoices = await Invoice.findAll({
      where: { student_id: student.id },
      include: [
        { model: Class, attributes: ['id', 'class_name'] },
        { model: InvoiceItem, as: 'items' },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json({ invoices });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Not found' });

    const { due_date, status, description, month } = req.body;
    if (due_date) invoice.due_date = due_date;
    if (status) invoice.status = status;
    if (description !== undefined) invoice.description = description;
    if (month) invoice.month = month;
    await invoice.save();
    res.json(invoice);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    await InvoiceItem.destroy({ where: { invoice_id: invoice.id } });
    await Payment.destroy({ where: { invoice_id: invoice.id } });
    await invoice.destroy();
    res.sendStatus(204);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.generateInvoices = async (req, res) => {
  try {
    const { class_id, month, due_date, student_ids, custom_charges } = req.body;
    if (!class_id || !month || !student_ids || !Array.isArray(student_ids) || student_ids.length === 0)
      return res.status(400).json({ message: 'Class, month, and students required' });

    const classRec = await Class.findByPk(class_id);
    if (!classRec) return res.status(404).json({ message: 'Class not found' });

    const feeStructure = await FeeStructure.findOne({
      where: { class_id },
      include: [{ model: FeeStructureItem, as: 'items' }],
      order: [['created_at', 'DESC']],
    });
    if (!feeStructure) return res.status(400).json({ message: 'No fee structure found for this class' });

    const baseItems = feeStructure.items.map(item => ({
      fee_type: item.description,
      amount: parseFloat(item.amount),
    }));

    const customItems = Array.isArray(custom_charges) ? custom_charges
      .filter(c => c.description && c.amount && parseFloat(c.amount) > 0)
      .map(c => ({ fee_type: c.description, amount: parseFloat(c.amount) })) : [];

    const allItems = [...baseItems, ...customItems];
    const totalAmount = allItems.reduce((sum, item) => sum + item.amount, 0);
    if (totalAmount <= 0) return res.status(400).json({ message: 'Total amount must be > 0' });

    const createdInvoices = [];
    for (const studentId of student_ids) {
      const invoice = await Invoice.create({
        invoice_number: generateInvoiceNumber(),
        student_id: studentId,
        class_id,
        due_date: due_date || null,
        month,
        total_amount: totalAmount,
        status: 'pending',
        description: `Fees for ${month}`,
        created_by: req.user.userId,
      });

      for (const item of allItems) {
        await InvoiceItem.create({ invoice_id: invoice.id, fee_type: item.fee_type, amount: item.amount });
      }
      createdInvoices.push(invoice);

      // 🔔 Notify student
      const student = await Student.findByPk(studentId);
      if (student) {
        const user = await User.findOne({ where: { email: student.email } });
        if (user) await sendNotificationToUser(user.id, `📄 New invoice generated for ${month}: Rs. ${totalAmount}`);
      }
    }

    await sendNotificationToRole('accountant', `📄 ${createdInvoices.length} invoices generated for class ${classRec.class_name} (${month})`);
    await sendNotificationToRole('principal', `📄 ${createdInvoices.length} invoices generated for class ${classRec.class_name} (${month})`);

    res.status(201).json({ message: `${createdInvoices.length} invoices generated`, invoices: createdInvoices });
  } catch (err) { res.status(400).json({ message: err.message }); }
};

// ─── Payments ───
exports.submitPayment = async (req, res) => {
  try {
    const { invoice_id, amount_paid, method, reference_no, sender_account } = req.body;
    if (!invoice_id || !amount_paid || !method) return res.status(400).json({ message: 'Missing required fields' });

    const invoice = await Invoice.findByPk(invoice_id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    let student_id = req.body.student_id;
    if (!student_id) {
      if (req.user.role === 'student') {
        const student = await Student.findOne({ where: { email: req.user.email } });
        if (student) student_id = student.id;
      } else if (req.user.role === 'parent') {
        const student = await Student.findOne({ where: { parent_email: req.user.email } });
        if (student) student_id = student.id;
        else return res.status(400).json({ message: 'Student not linked to this parent' });
      }
    }
    if (!student_id) return res.status(400).json({ message: 'Student ID required' });

    const totalPaid = await Payment.sum('amount_paid', {
      where: { invoice_id, status: { [Op.ne]: 'rejected' } },
    }) || 0;
    const remaining = parseFloat(invoice.total_amount) - parseFloat(totalPaid);
    if (parseFloat(amount_paid) > remaining) {
      return res.status(400).json({ message: `Remaining amount is only Rs. ${remaining}` });
    }

    const payment = await Payment.create({
      invoice_id,
      student_id,
      amount_paid,
      method,
      reference_no: reference_no || null,
      sender_account: sender_account || null,
      status: 'pending',
      submitted_by: req.user.role === 'parent' ? 'parent' : 'student',
      submitted_by_user_id: req.user.userId,
    });

    await sendNotificationToRole('accountant', `💳 New payment of Rs. ${amount_paid} via ${method} submitted by ${req.user.email}`);
    await sendNotificationToRole('principal', `💳 New payment of Rs. ${amount_paid} via ${method} submitted by ${req.user.email}`);

    res.status(201).json(payment);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

// ✅ Get my payments (student/parent)
exports.getMyPayments = async (req, res) => {
  try {
    let student = null;
    if (req.user.role === 'student') {
      student = await Student.findOne({ where: { email: req.user.email } });
    } else if (req.user.role === 'parent') {
      student = await Student.findOne({ where: { parent_email: req.user.email } });
    }
    if (!student) return res.status(404).json({ message: 'Student record not found' });

    const payments = await Payment.findAll({
      where: { student_id: student.id },
      include: [{ model: Invoice, as: 'invoice', attributes: ['invoice_number', 'month', 'total_amount'] }],
      order: [['created_at', 'DESC']],
    });
    res.json({ payments });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getPayments = async (req, res) => {
  try {
    const { student_id, invoice_id, status, method, page = 1, limit = 20 } = req.query;
    const where = {};
    if (student_id) where.student_id = student_id;
    if (invoice_id) where.invoice_id = invoice_id;
    if (status) where.status = status;
    if (method) where.method = method;

    const offset = (page - 1) * limit;
    const { count, rows } = await Payment.findAndCountAll({
      where,
      include: [
        { model: Invoice, as: 'invoice', attributes: ['invoice_number', 'month', 'total_amount'] },
        { model: Student, attributes: ['id', 'name', 'roll_no', 'class'] },
        { model: User, as: 'submittedByUser', attributes: ['id', 'name'] },
      ],
      offset,
      limit: parseInt(limit),
      order: [['created_at', 'DESC']],
    });
    res.json({ payments: rows, total: count, page, limit });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updatePayment = async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Not found' });

    const { amount_paid, method, reference_no, sender_account, status } = req.body;
    if (amount_paid) {
      const invoice = await Invoice.findByPk(payment.invoice_id);
      const totalPaid = await Payment.sum('amount_paid', {
        where: { invoice_id: invoice.id, id: { [Op.ne]: payment.id }, status: { [Op.ne]: 'rejected' } },
      }) || 0;
      const remaining = parseFloat(invoice.total_amount) - parseFloat(totalPaid);
      if (parseFloat(amount_paid) > remaining) {
        return res.status(400).json({ message: `Remaining amount is only Rs. ${remaining}` });
      }
      payment.amount_paid = amount_paid;
    }
    if (method) payment.method = method;
    if (reference_no !== undefined) payment.reference_no = reference_no;
    if (sender_account !== undefined) payment.sender_account = sender_account;
    if (status) payment.status = status;
    await payment.save();
    res.json(payment);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    await payment.destroy();
    res.sendStatus(204);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.approvePayment = async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    payment.status = 'approved';
    await payment.save();

    const invoice = await Invoice.findByPk(payment.invoice_id);
    if (invoice) {
      const totalPaid = await Payment.sum('amount_paid', { where: { invoice_id: invoice.id, status: 'approved' } });
      const total = parseFloat(invoice.total_amount);
      invoice.status = totalPaid >= total ? 'paid' : 'partial';
      await invoice.save();
    }

    const student = await Student.findByPk(payment.student_id);
    if (student) {
      const user = await User.findOne({ where: { email: student.email } });
      if (user) await sendNotificationToUser(user.id, `✅ Payment of Rs. ${payment.amount_paid} approved`);
    }

    await sendNotificationToRole('accountant', `✅ Payment approved for ${student?.name || 'student'}`);
    await sendNotificationToRole('principal', `✅ Payment approved for ${student?.name || 'student'}`);

    res.json(payment);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.rejectPayment = async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    payment.status = 'rejected';
    await payment.save();
    res.json(payment);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.manualPayment = async (req, res) => {
  try {
    const { invoice_id, amount_paid, method = 'cash', reference_no } = req.body;
    if (!invoice_id || !amount_paid) return res.status(400).json({ message: 'Invoice and amount required' });

    const invoice = await Invoice.findByPk(invoice_id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const totalPaid = await Payment.sum('amount_paid', {
      where: { invoice_id, status: { [Op.ne]: 'rejected' } },
    }) || 0;
    const remaining = parseFloat(invoice.total_amount) - parseFloat(totalPaid);
    if (parseFloat(amount_paid) > remaining) {
      return res.status(400).json({ message: `Remaining amount is only Rs. ${remaining}` });
    }

    const payment = await Payment.create({
      invoice_id,
      student_id: invoice.student_id,
      amount_paid,
      method,
      reference_no: reference_no || null,
      status: 'approved',
      submitted_by: 'student',
      submitted_by_user_id: req.user.userId,
    });

    const totalPaidNow = await Payment.sum('amount_paid', { where: { invoice_id, status: 'approved' } });
    invoice.status = totalPaidNow >= parseFloat(invoice.total_amount) ? 'paid' : 'partial';
    await invoice.save();

    const student = await Student.findByPk(invoice.student_id);
    if (student) {
      const user = await User.findOne({ where: { email: student.email } });
      if (user) await sendNotificationToUser(user.id, `💵 Manual payment of Rs. ${amount_paid} recorded`);
    }

    res.status(201).json(payment);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

// ─── Settings ───
exports.getSettings = async (req, res) => {
  try { res.json(await FinanceSetting.findAll()); }
  catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    for (const s of settings) {
      const [record, created] = await FinanceSetting.findOrCreate({
        where: { setting_key: s.setting_key },
        defaults: { setting_value: s.setting_value },
      });
      if (!created) { record.setting_value = s.setting_value; await record.save(); }
    }
    res.json(await FinanceSetting.findAll());
  } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.getReceipt = async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        { model: Invoice, as: 'invoice', include: [
          { model: Student, attributes: ['name', 'roll_no', 'class'] },
          { model: Class, attributes: ['class_name'] }
        ]},
        { model: Student, attributes: ['name', 'roll_no', 'class'] },
      ],
    });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    if (req.user.role === 'student' || req.user.role === 'parent') {
      const student = await Student.findOne({ where: { email: req.user.email } });
      if (!student || payment.student_id !== student.id)
        return res.status(403).json({ message: 'Forbidden' });
    }

    const receipt = {
      receipt_no: `RCPT-${payment.id}`,
      date: payment.payment_date,
      student_name: payment.Student?.name,
      roll_no: payment.Student?.roll_no,
      class: payment.Student?.class,
      invoice_number: payment.Invoice?.invoice_number,
      month: payment.Invoice?.month,
      amount_paid: payment.amount_paid,
      method: payment.method,
      reference_no: payment.reference_no,
      status: payment.status,
    };
    res.json(receipt);
  } catch (err) { res.status(500).json({ message: err.message }); }
};