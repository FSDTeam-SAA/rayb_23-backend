const { Router } = require("express");
const chatController = require("./chat.controller");

const router = Router();

router.post(
  "/create",
  chatController.createChat
);

router.get(
  "/",
  chatController.getChat
);

router.get(
  "/my-chat/:userId",
  chatController.getMyChat
);

const chatRouter = router;
module.exports = chatRouter;
