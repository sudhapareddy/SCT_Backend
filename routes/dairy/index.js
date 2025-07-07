const express = require('express');
const router = express.Router();

// Import individual route files
const addDairy = require('./addDairy');
const editDairy = require('./editDairy');
const deleteDairy = require('./deleteDairy');
const getDairy = require('./getDairy');
const getDairyByCode = require('./getDairyByCode');
const verifyToken = require('../../middlewares/authMiddleware');
const authorizeRoles = require('../../middlewares/authorizeRoles');
// Mount the individual routes under /api/dairy
router.use('/add', verifyToken, authorizeRoles('admin'), addDairy);
router.use('/edit', verifyToken, authorizeRoles('admin', 'dairy'), editDairy);
router.use('/delete', verifyToken, authorizeRoles('admin'), deleteDairy);
router.use('/', verifyToken, authorizeRoles('admin'), getDairyByCode);
router.use('/', verifyToken, authorizeRoles('admin'), getDairy);

module.exports = router;
