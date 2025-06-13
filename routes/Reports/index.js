const express = require("express");
const router = express.Router();
const verifyToken = require("../../middlewares/authMiddleware"); // auth middleware

const datewiseReport = require("./datewiseReport");
const datewiseMultipleReport = require("./datewiseMutipleReport");

const absentReport = require("./absentMembersReport");

const codewiseReport = require("./codewiseReport");
const authorizeRoles = require("../../middlewares/authorizeRoles");

// Apply verifyToken middleware for all device routes
//router.use(verifyToken);
const cumulativeReport = require("./cumulativeReport");
const datewiseDetailedReport = require("./datewiseDetailedReport");
const datewiseSummaryReport = require("./datewiseSummaryReport");

router.use(
  "/datewise-report",
  verifyToken,
  authorizeRoles("admin", "dairy", "device"),
  datewiseReport
);
router.use(
  "/datewise-report",
  verifyToken,
  authorizeRoles("admin", "dairy", "device"),
  datewiseMultipleReport
);

router.use(
  "/codewise-report",
  verifyToken,
  authorizeRoles("admin", "dairy", "device"),
  codewiseReport
);

router.use(
  "/absent-members-report",
  verifyToken,
  authorizeRoles("admin", "dairy", "device"),
  absentReport
);

router.use(
  "/cumulative-report",
  verifyToken,
  authorizeRoles("admin", "dairy", "device"),
  cumulativeReport
);

router.use(
  "/datewise-detailed-report",
  //verifyToken,
  //authorizeRoles("admin", "dairy", "device"),
  datewiseDetailedReport
);

router.use(
  "/datewise-summary-report",
  //verifyToken,
  //authorizeRoles("admin", "dairy", "device"),
  datewiseSummaryReport
);

module.exports = router;
