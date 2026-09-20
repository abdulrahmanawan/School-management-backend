const { Op } = require('sequelize');

const Book = require('../models/Book');

const BookIssue = require('../models/BookIssue');

const BorrowRequest = require('../models/BorrowRequest');

const Student = require('../models/Student');

const Teacher = require('../models/Teacher');

const User = require('../models/User');

const Invoice = require('../models/Invoice');

const InvoiceItem = require('../models/InvoiceItem');

const Class = require('../models/Class');

const {
  sendNotificationToUser,
  sendNotificationToRole
} = require('./notificationController');

const {
  sendModuleUpdateToUser,
  sendModuleUpdateToRole
} = require('../socket');

function generateInvoiceNumber() {
  const timestamp =
    Date.now().toString().slice(-8);

  return `INV-${timestamp}`;
}

async function getStudentByEmail(
  email
) {
  return await Student.findOne({
    where: { email }
  });
}

async function getTeacherByEmail(
  email
) {
  return await Teacher.findOne({
    where: { email }
  });
}

/* ─── Book CRUD ─── */

exports.getBooks = async (
  req,
  res
) => {
  try {
    const {
      search,
      category,
      available,
      page = 1,
      limit = 20
    } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        {
          title: {
            [Op.like]: `%${search}%`
          }
        },
        {
          author: {
            [Op.like]: `%${search}%`
          }
        },
        {
          isbn: {
            [Op.like]: `%${search}%`
          }
        }
      ];
    }

    if (category) {
      where.category =
        category;
    }

    if (available === 'true') {
      where.available_copies =
        {
          [Op.gt]: 0
        };
    }

    if (available === 'false') {
      where.available_copies = 0;
    }

    const offset =
      (page - 1) * limit;

    const {
      count,
      rows
    } =
      await Book.findAndCountAll({
        where,
        offset,
        limit:
          parseInt(limit),
        order: [
          [
            'title',
            'ASC'
          ]
        ]
      });

    res.json({
      books: rows,
      total: count,
      page,
      limit
    });
  } catch (err) {
    res.status(500).json({
      message:
        err.message
    });
  }
};

exports.getBookById =
  async (req, res) => {
    try {
      const book =
        await Book.findByPk(
          req.params.id
        );

      if (!book) {
        return res.status(404).json({
          message:
            'Book not found'
        });
      }

      res.json(book);
    } catch (err) {
      res.status(500).json({
        message:
          err.message
      });
    }
  };

exports.createBook =
  async (req, res) => {
    try {
      const {
        title,
        author,
        isbn,
        category,
        total_copies,
        shelf_number
      } = req.body;

      if (
        !title ||
        !author ||
        !isbn ||
        !total_copies
      ) {
        return res.status(400).json({
          message:
            'Missing required fields'
        });
      }

      const book =
        await Book.create({
          title,
          author,
          isbn,
          category:
            category ||
            'General',
          total_copies:
            parseInt(
              total_copies
            ),
          available_copies:
            parseInt(
              total_copies
            ),
          shelf_number:
            shelf_number ||
            null
        });

      /* 🔔 Notify librarian/principal */

      await sendNotificationToRole(
        'librarian',
        `📚 New book added: "${title}"`
      );

      await sendNotificationToRole(
        'principal',
        `📚 New book added: "${title}"`
      );

      res.status(201).json(
        book
      );
    } catch (err) {
      res.status(400).json({
        message:
          err.message
      });
    }
  };

exports.updateBook =
  async (req, res) => {
    try {
      const book =
        await Book.findByPk(
          req.params.id
        );

      if (!book) {
        return res.status(404).json({
          message:
            'Book not found'
        });
      }

      const {
        title,
        author,
        isbn,
        category,
        total_copies,
        shelf_number
      } = req.body;

      if (title) {
        book.title =
          title;
      }

      if (author) {
        book.author =
          author;
      }

      if (isbn) {
        book.isbn =
          isbn;
      }

      if (category) {
        book.category =
          category;
      }

      if (
        shelf_number !==
        undefined
      ) {
        book.shelf_number =
          shelf_number;
      }

      if (total_copies) {
        const issued =
          book.total_copies -
          book.available_copies;

        book.total_copies =
          parseInt(
            total_copies
          );

        book.available_copies =
          parseInt(
            total_copies
          ) - issued;

        if (
          book.available_copies <
          0
        ) {
          book.available_copies = 0;
        }
      }

      await book.save();

      res.json(book);
    } catch (err) {
      res.status(400).json({
        message:
          err.message
      });
    }
  };

exports.deleteBook =
  async (req, res) => {
    try {
      const book =
        await Book.findByPk(
          req.params.id
        );

      if (!book) {
        return res.status(404).json({
          message:
            'Book not found'
        });
      }

      await book.destroy();

      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({
        message:
          err.message
      });
    }
  };

/* ─── Borrow Requests ─── */

exports.requestBook =
  async (req, res) => {
    try {
      const bookId =
        req.params.bookId;

      const book =
        await Book.findByPk(
          bookId
        );

      if (!book) {
        return res.status(404).json({
          message:
            'Book not found'
        });
      }

      if (
        book.available_copies <
        1
      ) {
        return res.status(400).json({
          message:
            'No copies available'
        });
      }

      let borrowerId =
        null;

      let borrowerType =
        'student';

      if (
        req.user.role ===
        'student'
      ) {
        const student =
          await getStudentByEmail(
            req.user.email
          );

        if (student) {
          borrowerId =
            student.id;
        }
      } else if (
        req.user.role ===
        'teacher'
      ) {
        const teacher =
          await getTeacherByEmail(
            req.user.email
          );

        if (teacher) {
          borrowerId =
            teacher.id;

          borrowerType =
            'teacher';
        }
      }

      if (!borrowerId) {
        return res.status(403).json({
          message:
            'Borrower not found'
        });
      }

      const existing =
        await BorrowRequest.findOne(
          {
            where: {
              book_id:
                bookId,
              borrower_id:
                borrowerId,
              status:
                'pending'
            }
          }
        );

      if (existing) {
        return res.status(400).json({
          message:
            'You already have a pending request'
        });
      }

      const request =
        await BorrowRequest.create(
          {
            book_id:
              bookId,
            borrower_id:
              borrowerId,
            borrower_type:
              borrowerType,
            status:
              'pending'
          }
        );

      /* 🔔 Notify librarian/principal */

      await sendNotificationToRole(
        'librarian',
        `📥 New borrow request for "${book.title}"`
      );

      await sendNotificationToRole(
        'principal',
        `📥 New borrow request for "${book.title}"`
      );

      /* 🔄 Update sidebar module counts */

      await sendModuleUpdateToRole(
        'librarian'
      );

      await sendModuleUpdateToRole(
        'principal'
      );

      await sendModuleUpdateToRole(
        'owner'
      );

      res.status(201).json(
        request
      );
    } catch (err) {
      res.status(400).json({
        message:
          err.message
      });
    }
  };

exports.getRequests =
  async (req, res) => {
    try {
      const {
        status,
        page = 1,
        limit = 20
      } = req.query;

      const where = {};

      if (status) {
        where.status =
          status;
      }

      const offset =
        (page - 1) * limit;

      const {
        count,
        rows
      } =
        await BorrowRequest.findAndCountAll(
          {
            where,
            include: [
              {
                model: Book,
                attributes: [
                  'id',
                  'title',
                  'author',
                  'isbn'
                ]
              },
              {
                model: Student,
                as: 'Student',
                attributes: [
                  'id',
                  'name',
                  'roll_no',
                  'class'
                ],
                required:
                  false
              },
              {
                model: Teacher,
                as: 'Teacher',
                attributes: [
                  'id',
                  'name'
                ],
                required:
                  false
              }
            ],
            offset,
            limit:
              parseInt(
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
        requests: rows,
        total: count,
        page,
        limit
      });
    } catch (err) {
      res.status(500).json({
        message:
          err.message
      });
    }
  };

exports.approveRequest =
  async (req, res) => {
    try {
      const request =
        await BorrowRequest.findByPk(
          req.params.requestId
        );

      if (!request) {
        return res.status(404).json({
          message:
            'Request not found'
        });
      }

      if (
        request.status !==
        'pending'
      ) {
        return res.status(400).json({
          message:
            'Request already processed'
        });
      }

      const book =
        await Book.findByPk(
          request.book_id
        );

      if (
        !book ||
        book.available_copies <
          1
      ) {
        return res.status(400).json({
          message:
            'Book not available'
        });
      }

      book.available_copies -=
        1;

      if (
        book.available_copies <
        0
      ) {
        book.available_copies = 0;
      }

      await book.save();

      request.status =
        'approved';

      request.processed_by =
        req.user.userId;

      await request.save();

      /* 🔔 Notify borrower */

      let email = null;

      if (
        request.borrower_type ===
        'student'
      ) {
        const student =
          await Student.findByPk(
            request.borrower_id
          );

        if (student) {
          email =
            student.email;
        }
      } else {
        const teacher =
          await Teacher.findByPk(
            request.borrower_id
          );

        if (teacher) {
          email =
            teacher.email;
        }
      }

      let borrowerUser =
        null;

      if (email) {
        borrowerUser =
          await User.findOne({
            where: {
              email
            }
          });

        if (borrowerUser) {
          await sendNotificationToUser(
            borrowerUser.id,
            `📚 Your request for "${book.title}" has been approved. Please visit the library to collect the book.`
          );

          /* 🔄 Update borrower's library count */

          await sendModuleUpdateToUser(
            borrowerUser.id
          );
        }
      }

      /* 🔄 Update sidebar module counts */

      await sendModuleUpdateToRole(
        'librarian'
      );

      await sendModuleUpdateToRole(
        'principal'
      );

      await sendModuleUpdateToRole(
        'owner'
      );

      res.json(
        request
      );
    } catch (err) {
      res.status(400).json({
        message:
          err.message
      });
    }
  };

exports.rejectRequest =
  async (req, res) => {
    try {
      const request =
        await BorrowRequest.findByPk(
          req.params.requestId
        );

      if (!request) {
        return res.status(404).json({
          message:
            'Request not found'
        });
      }

      request.status =
        'rejected';

      request.processed_by =
        req.user.userId;

      await request.save();

      /* 🔔 Notify borrower */

      let email = null;

      if (
        request.borrower_type ===
        'student'
      ) {
        const student =
          await Student.findByPk(
            request.borrower_id
          );

        if (student) {
          email =
            student.email;
        }
      } else {
        const teacher =
          await Teacher.findByPk(
            request.borrower_id
          );

        if (teacher) {
          email =
            teacher.email;
        }
      }

      if (email) {
        const user =
          await User.findOne({
            where: {
              email
            }
          });

        if (user) {
          await sendNotificationToUser(
            user.id,
            `❌ Your request for "${request.Book?.title}" was rejected.`
          );

          /* 🔄 Update borrower's library count */

          await sendModuleUpdateToUser(
            user.id
          );
        }
      }

      /* 🔄 Update sidebar module counts */

      await sendModuleUpdateToRole(
        'librarian'
      );

      await sendModuleUpdateToRole(
        'principal'
      );

      await sendModuleUpdateToRole(
        'owner'
      );

      res.json(
        request
      );
    } catch (err) {
      res.status(400).json({
        message:
          err.message
      });
    }
  };

/* ─── Manual Issue ─── */

exports.issueBook =
  async (req, res) => {
    try {
      const {
        book_id,
        borrower_type,
        borrower_id,
        issue_date,
        due_date,
        request_id
      } = req.body;

      let finalBorrowerId =
        borrower_id;

      let finalBorrowerType =
        borrower_type;

      let finalBookId =
        book_id;

      if (request_id) {
        const request =
          await BorrowRequest.findByPk(
            request_id
          );

        if (!request) {
          return res.status(404).json({
            message:
              'Request not found'
          });
        }

        if (
          request.status !==
          'approved'
        ) {
          return res.status(400).json({
            message:
              'Request is not approved'
          });
        }

        finalBorrowerId =
          request.borrower_id;

        finalBorrowerType =
          request.borrower_type;

        finalBookId =
          request.book_id;
      }

      if (
        !finalBookId ||
        !finalBorrowerType ||
        !finalBorrowerId ||
        !issue_date ||
        !due_date
      ) {
        return res.status(400).json({
          message:
            'Missing required fields'
        });
      }

      const today =
        new Date()
          .toISOString()
          .split('T')[0];

      if (
        issue_date <
        today
      ) {
        return res.status(400).json({
          message:
            'Issue date cannot be in the past'
        });
      }

      if (
        due_date <
        today
      ) {
        return res.status(400).json({
          message:
            'Due date cannot be in the past'
        });
      }

      const book =
        await Book.findByPk(
          finalBookId
        );

      if (!book) {
        return res.status(404).json({
          message:
            'Book not found'
        });
      }

      if (
        !request_id &&
        book.available_copies <
          1
      ) {
        return res.status(400).json({
          message:
            'Book is currently unavailable'
        });
      }

      const issue =
        await BookIssue.create({
          book_id:
            finalBookId,
          borrower_id:
            finalBorrowerId,
          borrower_type:
            finalBorrowerType,
          issue_date,
          due_date,
          status:
            'issued'
        });

      if (!request_id) {
        book.available_copies -=
          1;

        if (
          book.available_copies <
          0
        ) {
          book.available_copies = 0;
        }

        await book.save();
      }

      if (request_id) {
        const request =
          await BorrowRequest.findByPk(
            request_id
          );

        if (request) {
          request.status =
            'issued';

          request.processed_by =
            req.user.userId;

          await request.save();
        }
      }

      /* 🔔 Notify borrower */

      let email = null;

      if (
        finalBorrowerType ===
        'student'
      ) {
        const student =
          await Student.findByPk(
            finalBorrowerId
          );

        if (student) {
          email =
            student.email;
        }
      } else {
        const teacher =
          await Teacher.findByPk(
            finalBorrowerId
          );

        if (teacher) {
          email =
            teacher.email;
        }
      }

      if (email) {
        const user =
          await User.findOne({
            where: {
              email
            }
          });

        if (user) {
          await sendNotificationToUser(
            user.id,
            `📚 Book "${book.title}" has been issued to you. Due date: ${due_date}`
          );

          /* 🔄 Update borrower's library count */

          await sendModuleUpdateToUser(
            user.id
          );
        }
      }

      /* 🔄 Update sidebar module counts */

      await sendModuleUpdateToRole(
        'librarian'
      );

      await sendModuleUpdateToRole(
        'principal'
      );

      await sendModuleUpdateToRole(
        'owner'
      );

      res.status(201).json(
        issue
      );
    } catch (err) {
      res.status(400).json({
        message:
          err.message
      });
    }
  };

/* ─── Issue Management ─── */

exports.getIssues =
  async (req, res) => {
    try {
      const {
        status,
        borrower_type,
        page = 1,
        limit = 20
      } = req.query;

      const where = {};

      if (status) {
        where.status =
          status;
      }

      if (borrower_type) {
        where.borrower_type =
          borrower_type;
      }

      const offset =
        (page - 1) * limit;

      const {
        count,
        rows
      } =
        await BookIssue.findAndCountAll(
          {
            where,
            include: [
              {
                model: Book,
                attributes: [
                  'id',
                  'title',
                  'author',
                  'isbn'
                ]
              },
              {
                model: Student,
                as: 'Student',
                attributes: [
                  'id',
                  'name',
                  'roll_no',
                  'class'
                ],
                required:
                  false
              },
              {
                model: Teacher,
                as: 'Teacher',
                attributes: [
                  'id',
                  'name'
                ],
                required:
                  false
              }
            ],
            offset,
            limit:
              parseInt(
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
        issues: rows,
        total: count,
        page,
        limit
      });
    } catch (err) {
      res.status(500).json({
        message:
          err.message
      });
    }
  };

exports.returnBook =
  async (req, res) => {
    try {
      const issue =
        await BookIssue.findByPk(
          req.params.issueId
        );

      if (!issue) {
        return res.status(404).json({
          message:
            'Issue not found'
        });
      }

      if (
        issue.status ===
        'returned'
      ) {
        return res.status(400).json({
          message:
            'Already returned'
        });
      }

      const returnDate =
        new Date()
          .toISOString()
          .split('T')[0];

      let fine = 0;

      const due =
        new Date(
          issue.due_date
        );

      if (
        new Date(
          returnDate
        ) > due
      ) {
        const diffDays =
          Math.ceil(
            (
              new Date(
                returnDate
              ) - due
            ) /
              (1000 *
                60 *
                60 *
                24)
          );

        fine =
          diffDays * 10;
      }

      issue.return_date =
        returnDate;

      issue.fine =
        fine;

      issue.status =
        'returned';

      issue.return_requested =
        false;

      await issue.save();

      const book =
        await Book.findByPk(
          issue.book_id
        );

      if (book) {
        book.available_copies +=
          1;

        await book.save();
      }

      /* 📌 Auto-create finance invoice for fine if borrower is student and fine > 0 */

      if (
        fine > 0 &&
        issue.borrower_type ===
          'student'
      ) {
        const student =
          await Student.findByPk(
            issue.borrower_id
          );

        if (student) {
          const classRec =
            await Class.findOne({
              where: {
                class_name:
                  student.class
              }
            });

          if (classRec) {
            const month =
              new Date()
                .toISOString()
                .slice(
                  0,
                  7
                );

            const invoice =
              await Invoice.create({
                invoice_number:
                  generateInvoiceNumber(),
                student_id:
                  student.id,
                class_id:
                  classRec.id,
                due_date:
                  returnDate,
                month,
                total_amount:
                  fine,
                status:
                  'pending',
                description:
                  `Library fine for "${book?.title}"`,
                created_by:
                  req.user.userId
              });

            await InvoiceItem.create(
              {
                invoice_id:
                  invoice.id,
                fee_type:
                  `Library fine - ${book?.title || 'Book'}`,
                amount:
                  fine
              }
            );

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
                `✅ Book "${book?.title}" has been returned. Fine: Rs. ${fine} added to your finance.`
              );

              /* 🔄 Update student's finance count */

              await sendModuleUpdateToUser(
                user.id
              );
            }
          }
        }
      }

      /* 🔔 Notify librarian/principal if fine occurred */

      if (fine > 0) {
        await sendNotificationToRole(
          'librarian',
          `💰 Fine of Rs. ${fine} for "${book?.title}" return`
        );

        await sendNotificationToRole(
          'principal',
          `💰 Fine of Rs. ${fine} for "${book?.title}" return`
        );
      }

      /* 🔄 Update sidebar module counts */

      await sendModuleUpdateToRole(
        'librarian'
      );

      await sendModuleUpdateToRole(
        'principal'
      );

      await sendModuleUpdateToRole(
        'owner'
      );

      res.json(issue);
    } catch (err) {
      res.status(400).json({
        message:
          err.message
      });
    }
  };

exports.requestReturn =
  async (req, res) => {
    try {
      const issueId =
        req.params.issueId;

      const issue =
        await BookIssue.findByPk(
          issueId
        );

      if (!issue) {
        return res.status(404).json({
          message:
            'Issue not found'
        });
      }

      if (
        issue.status ===
        'returned'
      ) {
        return res.status(400).json({
          message:
            'Already returned'
        });
      }

      let borrowerId =
        null;

      if (
        req.user.role ===
        'student'
      ) {
        const student =
          await Student.findOne({
            where: {
              email:
                req.user.email
            }
          });

        if (student) {
          borrowerId =
            student.id;
        }
      } else if (
        req.user.role ===
        'teacher'
      ) {
        const teacher =
          await Teacher.findOne({
            where: {
              email:
                req.user.email
            }
          });

        if (teacher) {
          borrowerId =
            teacher.id;
        }
      }

      if (
        !borrowerId ||
        borrowerId !==
          issue.borrower_id
      ) {
        return res.status(403).json({
          message:
            'You can only request return for your own books'
        });
      }

      issue.return_requested =
        true;

      await issue.save();

      /* 🔔 Notify librarian/principal */

      await sendNotificationToRole(
        'librarian',
        `📥 Return requested for "${issue.Book?.title}"`
      );

      await sendNotificationToRole(
        'principal',
        `📥 Return requested for "${issue.Book?.title}"`
      );

      /* 🔄 Update sidebar module counts */

      await sendModuleUpdateToRole(
        'librarian'
      );

      await sendModuleUpdateToRole(
        'principal'
      );

      await sendModuleUpdateToRole(
        'owner'
      );

      res.json(issue);
    } catch (err) {
      res.status(400).json({
        message:
          err.message
      });
    }
  };

exports.getMyBorrows =
  async (req, res) => {
    try {
      let borrowerId =
        null;

      let borrowerType =
        'student';

      if (
        req.user.role ===
        'student'
      ) {
        const student =
          await getStudentByEmail(
            req.user.email
          );

        if (student) {
          borrowerId =
            student.id;
        }
      } else if (
        req.user.role ===
        'teacher'
      ) {
        const teacher =
          await getTeacherByEmail(
            req.user.email
          );

        if (teacher) {
          borrowerId =
            teacher.id;

          borrowerType =
            'teacher';
        }
      }

      if (!borrowerId) {
        return res.status(403).json({
          message:
            'Borrower not found'
        });
      }

      const issues =
        await BookIssue.findAll({
          where: {
            borrower_id:
              borrowerId,
            borrower_type:
              borrowerType
          },
          include: [
            {
              model: Book,
              attributes: [
                'id',
                'title',
                'author',
                'isbn'
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

      const requests =
        await BorrowRequest.findAll(
          {
            where: {
              borrower_id:
                borrowerId,
              borrower_type:
                borrowerType
            },
            include: [
              {
                model: Book,
                attributes: [
                  'id',
                  'title',
                  'author',
                  'isbn'
                ]
              }
            ],
            order: [
              [
                'created_at',
                'DESC'
              ]
            ]
          }
        );

      res.json({
        issues,
        requests
      });
    } catch (err) {
      res.status(500).json({
        message:
          err.message
      });
    }
  };