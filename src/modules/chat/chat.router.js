const { Router } = require("express");
const chatController = require("./chat.controller");

const router = Router();

router.post("/create", chatController.createChat);
router.get("/my-chats/:userId", chatController.getChat);

const chatRouter = router;
module.exports = chatRouter;
