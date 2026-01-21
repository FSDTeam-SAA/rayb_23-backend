const messageService = require("./message.service");

const sendMessage = async (req, res) => {
  try {
    const result = await messageService.sendMessage(req.body, req.files);

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: result,
    });
  } catch (error) {
    throw new Error(error);
  }
};

const getMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const result = await messageService.getMessages(chatId);

    return res.status(200).json({
      success: true,
      message: "Messages retrieved successfully",
      data: result,
    });
  } catch (error) {
    throw new Error(error);
  }
};

const messageController = {
  sendMessage,
  getMessage,
};

module.exports = messageController;
