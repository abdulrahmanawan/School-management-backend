const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const verifyToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(verifyToken);

// Fee Structures
router.get('/fee-structures', roleCheck('owner','principal','accountant','student','parent'), financeController.getFeeStructures);
router.post('/fee-structures', roleCheck('owner','principal','accountant'), financeController.createFeeStructure);
router.put('/fee-structures/:id', roleCheck('owner','principal','accountant'), financeController.updateFeeStructure);
router.delete('/fee-structures/:id', roleCheck('owner','principal','accountant'), financeController.deleteFeeStructure);

// Subjects for class
router.get('/subjects/:classId', roleCheck('owner','principal','accountant'), financeController.getClassSubjects);

// Invoices
router.get('/invoices', roleCheck('owner','principal','accountant'), financeController.getInvoices);
// ⚠️ Keep /invoices/my BEFORE /invoices/:id
router.get('/invoices/my', roleCheck('student','parent'), financeController.getMyInvoices);
router.get('/invoices/:id', roleCheck('owner','principal','accountant','student','parent'), financeController.getInvoiceById);
router.put('/invoices/:id', roleCheck('owner','principal','accountant'), financeController.updateInvoice);
router.delete('/invoices/:id', roleCheck('owner','principal','accountant'), financeController.deleteInvoice);
router.post('/invoices/generate', roleCheck('owner','principal','accountant'), financeController.generateInvoices);

// Payments
router.post('/payments', roleCheck('student','parent'), financeController.submitPayment);
// ⚠️ Keep /payments/my BEFORE /payments/:id
router.get('/payments/my', roleCheck('student','parent'), financeController.getMyPayments);
router.get('/payments', roleCheck('owner','principal','accountant'), financeController.getPayments);
router.put('/payments/:id', roleCheck('owner','principal','accountant'), financeController.updatePayment);
router.delete('/payments/:id', roleCheck('owner','principal','accountant'), financeController.deletePayment);
router.put('/payments/:id/approve', roleCheck('owner','principal','accountant'), financeController.approvePayment);
router.put('/payments/:id/reject', roleCheck('owner','principal','accountant'), financeController.rejectPayment);
router.post('/payments/manual', roleCheck('owner','principal','accountant'), financeController.manualPayment);
router.get('/payments/:id/receipt', roleCheck('owner','principal','accountant','student','parent'), financeController.getReceipt);

// Settings
router.get('/settings', roleCheck('owner','principal','accountant','student','parent'), financeController.getSettings);
router.put('/settings', roleCheck('owner','principal','accountant'), financeController.updateSettings);

module.exports = router;