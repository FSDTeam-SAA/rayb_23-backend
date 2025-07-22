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

const getMyServiceOffered = async (req, res) => {
  try {
    const { email } = req.user;
    const result = await serviceOfferedService.getMyServiceOffered(email);

    return res.status(200).json({
      success: true,
      message: "My services offered retrieved successfully",
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
  getMyServiceOffered,
};

module.exports = serviceOfferedController;
