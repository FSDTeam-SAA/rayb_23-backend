const { Router } = require("express");
const auth = require("../../middleware/auth");
const USER_ROLE = require("../user/user.constant");
const serviceOfferedController = require("./serviceOffered.controller");

const router = Router();

router.post(
  "/create",
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  serviceOfferedController.createServiceOffered
);

const serviceOfferRouter = router;
module.exports = serviceOfferRouter;
