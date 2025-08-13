const express = require("express");
const router = express.Router();
const verifyToken = require("../../middlewares/authMiddleware"); // auth middleware

const authorizeRoles = require("../../middlewares/authorizeRoles");

const addRecord = require("./addRecord");
const getRecordByCodeDateShift = require("./getRecordByCode");
const getRecordsByDateShift = require("./getRecordsByDateShift");
const editRecord = require("./editRecord");
// const deleteMember = require('./deleteMember');

router.use(
  "/addRecord",
  verifyToken,
  authorizeRoles("admin", "dairy", "device"),
  addRecord
);
router.use(
  "/getRecordByCodeDateShift",
  verifyToken,
  authorizeRoles("admin", "dairy", "device"),
  getRecordByCodeDateShift
);

router.use(
  "/getRecordsByDateShift",
  verifyToken,
  authorizeRoles("admin", "dairy", "device"),
  getRecordsByDateShift
);
router.use(
  "/editRecord",
  verifyToken,
  authorizeRoles("admin", "dairy", "device"),
  editRecord
);
// router.use('/deleteMember',  verifyToken,authorizeRoles('admin','dairy','device'),deleteMember);

module.exports = router;
