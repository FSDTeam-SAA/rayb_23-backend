const { Router } = require("express");
const messageController = require("./message.controller");
const { upload } = require("../../utils/cloudnary");

const router = Router();

router.post(
  "/send-message",
  upload.single("image"),
  (req, res, next) => {
    if (req.body?.data) {
      try {
        req.parsedData = JSON.parse(req.body.data);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON format in 'data' field",
        });
      }
    }
    next();
  },
  messageController.sendMessage
);

router.get(
  "/:chatId",
  messageController.getMessage
);

router.get(
  "/resiver-message/:resiverId",
  messageController.getResiverMessage
);

router.get(
  "/sender-message/:senderId",
  messageController.getSenderMessages
);

router.put(
  "/update-message-status/:messageId",
  messageController.updateMessageStatus
);



const messageRouter = router;
module.exports = messageRouter;
