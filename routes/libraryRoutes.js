const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/libraryController');
const verifyToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(verifyToken);

// Book catalog
router.get('/books', roleCheck('superadmin','principal','librarian','student','teacher'), libraryController.getBooks);
router.get('/books/:id', roleCheck('superadmin','principal','librarian','student','teacher'), libraryController.getBookById);
router.post('/books', roleCheck('superadmin','principal','librarian'), libraryController.createBook);
router.put('/books/:id', roleCheck('superadmin','principal','librarian'), libraryController.updateBook);
router.delete('/books/:id', roleCheck('superadmin','principal','librarian'), libraryController.deleteBook);

// Borrow requests
router.post('/books/:bookId/request', roleCheck('student','teacher'), libraryController.requestBook);
router.get('/requests', roleCheck('superadmin','principal','librarian'), libraryController.getRequests);
router.put('/requests/:requestId/approve', roleCheck('superadmin','principal','librarian'), libraryController.approveRequest);
router.put('/requests/:requestId/reject', roleCheck('superadmin','principal','librarian'), libraryController.rejectRequest);

// Issues
router.post('/issues/manual', roleCheck('superadmin','principal','librarian'), libraryController.issueBook);
router.get('/issues', roleCheck('superadmin','principal','librarian'), libraryController.getIssues);
router.put('/issues/:issueId/return', roleCheck('superadmin','principal','librarian'), libraryController.returnBook);
router.post('/issues/:issueId/request-return', roleCheck('student','teacher'), libraryController.requestReturn);
router.get('/my-borrows', roleCheck('student','teacher'), libraryController.getMyBorrows);

module.exports = router;