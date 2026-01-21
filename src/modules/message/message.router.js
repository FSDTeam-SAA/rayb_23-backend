const { Router } = require("express");
const messageController = require("./message.controller");
const { upload } = require("../../utils/cloudnary");

const router = Router();

router.post(
  "/send-message",
  upload.array("image", 5),
  messageController.sendMessage,
);
router.get("/get-messages/:chatId", messageController.getMessage);

const messageRouter = router;
module.exports = messageRouter;
