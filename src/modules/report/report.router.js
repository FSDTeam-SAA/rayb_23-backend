const { Router } = require("express");
const reportController = require("./report.controller");
const auth = require("../../middleware/auth");
const USER_ROLE = require("../user/user.constant");

const router = Router();

router.post(
  "/create",
  auth(USER_ROLE.user, USER_ROLE.businessMan, USER_ROLE.admin),
  reportController.addReport
);

router.get(
  "/",
  //   auth(USER_ROLE.user, USER_ROLE.businessMan, USER_ROLE.admin),
  reportController.getAllReports
);

const reportRouter = router;
module.exports = reportRouter;
