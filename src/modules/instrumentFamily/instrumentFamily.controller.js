const instrumentService = require("./instrumentFamily.service");

const createInstrument = async (req, res) => {
  try {
    const result = await instrumentService.createInstrument(req.body);

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Instrument created successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const getAllInstrument = async (req, res) => {
  try {
    const result = await instrumentService.getAllInstrument();

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Instrument fetched successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const instrumentController = {
  createInstrument,
  getAllInstrument,
};

module.exports = instrumentController;
