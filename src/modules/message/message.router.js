const { Router } = require("express");
const messageController = require("./message.controller");
const { upload } = require("../../utils/cloudnary");

const router = Router();

// router.post(
//   "/send-message",
//   upload.array("image", 5), // 🔹 Accept up to 5 images with field name "image"
//   messageController.sendMessage
// );

const messageRouter = router;
module.exports = messageRouter;
