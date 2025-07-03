const { Router } = require("express");
const messageController = require("./message.controller");
const auth = require("../../middleware/auth");
const USER_ROLE = require("../user/user.constant");
const { upload } = require("../../utils/cloudnary");

const router = Router();

router.post(
  "/send-message",
  upload.single("image"),
  (req, res, next) => {
    if (req.body?.data) {
      try {
        req.body = JSON.parse(req.body.data);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON format in 'data' field",
        });
      }
    }
    next();
  },
  auth(USER_ROLE.bussinessMan, USER_ROLE.user, USER_ROLE.admin),
  messageController.sendMessage
);

router.get(
  "/",
  // auth(USER_ROLE.bussinessMan, USER_ROLE.user, USER_ROLE.admin),
  messageController.getMessage
);

router.get(
  "/resiver-message",
  auth(USER_ROLE.bussinessMan, USER_ROLE.user, USER_ROLE.admin),
  messageController.getResiverMessage
);

router.get(
  "/sender-message",
  auth(USER_ROLE.bussinessMan, USER_ROLE.user, USER_ROLE.admin),
  messageController.getSenderMessages
);

const messageRouter = router;
module.exports = messageRouter;
