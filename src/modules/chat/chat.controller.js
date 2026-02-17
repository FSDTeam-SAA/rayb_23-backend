const chatService = require("./chat.service");

const createChat = async (req, res) => {
  try {
    const { participants, businessId } = req.body;
    const result = await chatService.createChat(participants, businessId);

    return res.status(201).json({
      success: true,
      message: "Chat created successfully",
      data: result,
    });
  } catch (error) {
    throw new Error(error);
  }
};

const getChat = async (req, res) => {
  try {
    const { userId } = req.params;
    const { businessId } = req.query;
    const result = await chatService.getChat(userId, businessId);

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
  createChat,
  getChat,
};

module.exports = chatController;
