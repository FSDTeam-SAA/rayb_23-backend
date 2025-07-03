const { Router } = require("express");
const chatController = require("./chat.controller");
const auth = require("../../middleware/auth");
const USER_ROLE = require("../user/user.constant");

const router = Router();

router.post(
  "/create",
  auth(USER_ROLE.bussinessMan, USER_ROLE.user, USER_ROLE.admin),
  chatController.createChat
);

const chatRouter = router;
module.exports = chatRouter;
