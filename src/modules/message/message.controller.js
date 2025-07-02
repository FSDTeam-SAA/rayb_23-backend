const messageService = require("./message.service");

const sendMessage = async (req, res) => {
  try {
    const { email } = req.user;
    const result = await messageService.sendMessage(req.body, email, req.file);

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Message sent successfully",
      data: result,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, code: 400, message: error.message });
  }
};

const getMessage = async (req, res) => {
  try {
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, code: 400, message: error.message });
  }
};

const messageController = {
  sendMessage,
  getMessage,
};

module.exports = messageController;
