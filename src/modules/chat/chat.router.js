const { Router } = require("express");
const chatController = require("./chat.controller");

const router = Router();

router.post("/create", chatController.createChat);

router.get("/", chatController.getChat);

router.get("/my-chat/:userId", chatController.getMyChat);

router.get("/business-chat/:businessId", chatController.getChatForBusinessMan);

const chatRouter = router;
module.exports = chatRouter;
