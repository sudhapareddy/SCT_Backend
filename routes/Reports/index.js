const express = require('express');
const router = express.Router();
const verifyToken = require('../../middlewares/authMiddleware');  // auth middleware


const datewiseReport = require('./datewiseReport');
const datewiseMultipleReport = require('./datewiseMutipleReport');


const codewiseReport = require('./codewiseReport');
const authorizeRoles = require('../../middlewares/authorizeRoles');


// Apply verifyToken middleware for all device routes
//router.use(verifyToken);

router.use('/datewise-report', verifyToken, authorizeRoles('admin', 'dairy', 'device'), datewiseReport);
router.use('/datewise-report', verifyToken, authorizeRoles('admin', 'dairy', 'device'), datewiseMultipleReport);

router.use('/codewise-report', verifyToken, authorizeRoles('admin', 'dairy', 'device'), codewiseReport);

module.exports = router;



