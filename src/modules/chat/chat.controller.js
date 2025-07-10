const chatService = require("./chat.service");

const createChat = async (req, res) => {
  try {
    const result = await chatService.createChat(req.body);

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Chat created successfully",
      data: result,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, code: 400, message: error.message });
  }
};

const getChat = async (req, res) => {
  try {
    const result = await chatService.getChat();

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Chat get successfully",
      data: result,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, code: 400, message: error.message });
  }
};

const getMyChat = async (req, res) => {
  try {
    const result = await chatService.getMyChat(req.body);

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Your chat get successfully",
      data: result,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, code: 400, message: error.message });
  }
};

const chatController = {
  createChat,
  getChat,
  getMyChat,
};

module.exports = chatController;
