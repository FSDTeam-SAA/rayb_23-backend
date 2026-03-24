const { Router } = require("express");
const analyticsController = require("./analytics.controller");
const auth = require("../../middleware/auth");
const USER_ROLE = require("../user/user.constant");

const router = Router();

router.get(
  "/business-man/:businessId",
  auth(USER_ROLE.businessMan),
  analyticsController.businessManDashboardAnalytics,
);

const analyticsRouter = router;
module.exports = analyticsRouter;
