const chatService = require("./chat.service");

const getChat = async (req, res) => {
  try {
    const { userId } = req.query;
    const result = await chatService.getChat(userId);

    return res.status(200).json({
      success: true,
      message: "Chats retrieved successfully",
      data: result,
    });
  } catch (error) {
    throw new Error(error);
  }
};

const chatController = {
  getChat,
};

module.exports = chatController;
