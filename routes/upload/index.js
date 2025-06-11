const express = require("express");
const router = express.Router();


const snfCowTable = require("./snfCowTable");
const snfBufTable = require("./snfBufTable");
const fatBufTable = require("./fatBufTable");
const fatCowTable = require("./fatCowTable");
const membersTable = require("./members");
const verifyToken = require("../../middlewares/authMiddleware");
const authorizeRoles = require("../../middlewares/authorizeRoles");



router.use("/snf-cow-table", verifyToken, authorizeRoles('admin', 'dairy', 'device'), snfCowTable);
router.use("/snf-buf-table", verifyToken, authorizeRoles('admin', 'dairy', 'device'), snfBufTable);
router.use("/fat-buf-table", verifyToken, authorizeRoles('admin', 'dairy', 'device'), fatBufTable);
router.use("/fat-cow-table", verifyToken, authorizeRoles('admin', 'dairy', 'device'), fatCowTable);
router.use("/upload-members", verifyToken, authorizeRoles('admin', 'dairy', 'device'), membersTable);


module.exports = router;