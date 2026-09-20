const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const verifyToken = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(verifyToken);

// Owner and principal can manage users
router.get('/', roleCheck('owner','principal'), userController.getAll);
router.post('/', roleCheck('owner','principal'), userController.create);
router.put('/:id', roleCheck('owner','principal'), userController.update);
// ✅ Principal also can delete users now
router.delete('/:id', roleCheck('owner','principal'), userController.remove);

module.exports = router;