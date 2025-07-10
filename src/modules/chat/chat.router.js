const { Router } = require("express");
const chatController = require("./chat.controller");
const auth = require("../../middleware/auth");
const USER_ROLE = require("../user/user.constant");

const router = Router();

router.post(
  "/create",
  // auth(USER_ROLE.bussinessMan, USER_ROLE.user, USER_ROLE.admin),
  chatController.createChat
);

router.get(
  "/",
  // auth(USER_ROLE.bussinessMan, USER_ROLE.user, USER_ROLE.admin),
  chatController.getChat
);

router.get(
  "/my-chat",
  // auth(USER_ROLE.bussinessMan, USER_ROLE.user, USER_ROLE.admin),
  chatController.getMyChat
);

const chatRouter = router;
module.exports = chatRouter;
