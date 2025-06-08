const express = require("express");
const router = express.Router();
const verifyToken = require("../../middlewares/authMiddleware"); // auth middleware

const snfCowTable = require("./snfCowTable");
const snfBufTable = require("./snfBufTable");

const fatBufTable = require("./fatBufTable");
const fatCowTable = require("./fatCowTable");
const authorizeRoles = require("../../middlewares/authorizeRoles");
const membersTable = require("./members");

//Apply verifyToken middleware for all device routes

router.use("/snf-cow-table", verifyToken, authorizeRoles('admin', 'dairy', 'device'), snfCowTable);
router.use("/snf-buf-table", verifyToken, authorizeRoles('admin', 'dairy', 'device'), snfBufTable);
router.use("/fat-buf-table", verifyToken, authorizeRoles('admin', 'dairy', 'device'), fatBufTable);
router.use("/fat-cow-table", verifyToken, authorizeRoles('admin', 'dairy', 'device'), fatCowTable);
router.use("/upload-members", verifyToken, authorizeRoles('admin', 'dairy', 'device'), membersTable);

module.exports = router;
