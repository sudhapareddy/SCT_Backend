const express = require('express');
const router = express.Router();
const verifyToken = require('../../middlewares/authMiddleware');  // auth middleware

const addDevice = require('./addDevice');
const editDevice = require('./editDevice');
const deleteDevice = require('./deleteDevice');
const getDevice = require('./getDevice');
const getDeviceByCode = require("./getDeviceBycode")
const getDeviceByid = require("./getDeviceById");
const authorizeRoles = require('../../middlewares/authorizeRoles');

const addMember = require('./addMember');
const editMember = require('./editMember');
const deleteMember = require('./deleteMember');



router.use('/add', verifyToken, authorizeRoles('admin', 'dairy',), addDevice);
router.use('/edit', verifyToken, authorizeRoles('admin', 'dairy', 'device'), editDevice);
router.use('/delete', verifyToken, authorizeRoles('admin', 'dairy',), deleteDevice);
router.use('/getall', verifyToken, authorizeRoles('admin', 'dairy',), getDevice);
router.use('/devicecode', verifyToken, authorizeRoles('admin', 'dairy',), getDeviceByCode);
router.use('/deviceid', verifyToken, authorizeRoles('admin', 'dairy', 'device'), getDeviceByid);

router.use('/addMember', verifyToken, authorizeRoles('admin', 'dairy', 'device'), addMember);
router.use('/editMember',  verifyToken, authorizeRoles('admin', 'dairy', 'device'),editMember);
router.use('/deleteMember',  deleteMember);


module.exports = router;



