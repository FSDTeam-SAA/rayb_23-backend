const { Router } = require("express");
const chatController = require("./chat.controller");

const router = Router();

router.get("/", chatController.getChat);

const chatRouter = router;
module.exports = chatRouter;
