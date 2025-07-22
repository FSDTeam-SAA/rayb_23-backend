const serviceOfferedService = require("./serviceOffered.service");

const createServiceOffered = async (req, res) => {
  try {
    const { email } = req.user;
    const result = await serviceOfferedService.createServiceOffered(
      email,
      req.body
    );
    return res.status(201).json({
      success: true,
      message: "Service offered created successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      error: error,
    });
  }
};

const serviceOfferedController = {
  createServiceOffered,
};

module.exports = serviceOfferedController;
