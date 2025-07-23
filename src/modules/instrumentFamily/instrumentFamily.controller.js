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

const updateInstrument = async (req, res) => {
  try {
    const { instrumentId } = req.params;
    const result = await instrumentService.updateInstrument(
      instrumentId,
      req.body
    );

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Instrument updated successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const deleteInstrument = async (req, res) => {
  try {
    const { instrumentId } = req.params;
    await instrumentService.deleteInstrument(instrumentId);

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Instrument deleted successfully",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const instrumentController = {
  createInstrument,
  getAllInstrument,
  updateInstrument,
  deleteInstrument,
};

module.exports = instrumentController;
