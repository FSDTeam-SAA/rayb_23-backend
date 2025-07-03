const chatService = require("./chat.service");

const createChat = async (req, res) => {
  try {
    const { email } = req.user;
    const result = await chatService.createChat(email, req.body);

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

const chatController = {
  createChat,
};

module.exports = chatController;
