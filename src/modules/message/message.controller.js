const messageService = require("./message.service");

const sendMessage = async (req, res) => {
  try {
    const io = req.app.get("io");
    const payload = req.parsedData || req.body;
    const result = await messageService.sendMessage(payload, req.file, io);

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Message sent successfully",
      data: result,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ success: false, code: 400, message: error.message });
  }
};

const getMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    console.log(chatId);
    const result = await messageService.getMessages(chatId);

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Message retrieved successfully",
      data: result,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, code: 400, message: error.message });
  }
};

const getResiverMessage = async (req, res) => {
  try {
    // const { email } = req.user;
    const { resiverId } = req.params;
    const result = await messageService.getResiverMessage(resiverId);

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Message get successfully",
      data: result,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, code: 400, message: error.message });
  }
};

const getSenderMessages = async (req, res) => {
  try {
    const { senderId } = req.params;
    const result = await messageService.getSenderMessage(senderId);

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Message get successfully",
      data: result,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, code: 400, message: error.message });
  }
};

const updateMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const result = await messageService.updateMessageStatus(messageId);

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Message updated successfully",
      data: result,
    });

  } catch (error) {
    return res
      .status(400)
      .json({ success: false, code: 400, message: error.message });
  }
};

const messageController = {
  sendMessage,
  getMessage,
  getResiverMessage,
  getSenderMessages,
  updateMessageStatus
};

module.exports = messageController;
