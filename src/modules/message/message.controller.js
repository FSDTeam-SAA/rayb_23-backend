const messageService = require("./message.service");

const sendMessage = async (req, res) => {
  try {
    const io = req.app.get("io");
    const result = await messageService.sendMessage(req.body, req.file, io);

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
    const result = await messageService.getMessages();

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

    const result = await messageService.getResiverMessage(email, req.body);

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
    // const { email } = req.user;
    const result = await messageService.getSenderMessage(email, req.body);

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

const messageController = {
  sendMessage,
  getMessage,
  getResiverMessage,
  getSenderMessages,
};

module.exports = messageController;
