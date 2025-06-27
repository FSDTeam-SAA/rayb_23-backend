const { Router } = require("express");
const contractController = require("./contract.controller");

const router = Router();

router.post("/send-message", contractController.sendMessage);

const sendMessageRouter = router;
module.exports = sendMessageRouter;
