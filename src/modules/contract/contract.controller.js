const contractService = require("./contract.service");

const sendMessage = async (req, res) => {
  try {
    const result = await contractService.sendMessage(req.body);

    return res.status(200).json({
      success: true,
      message: "Message sent successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const contractController = {
  sendMessage,
};

module.exports = contractController;
