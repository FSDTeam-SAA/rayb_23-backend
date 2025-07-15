const { default: status } = require("http-status");
const InstrumentAndService = require("./instrumentAndService.model");
const User = require("../user/user.model");
const InstrumentFamilyModel = require("../instrumentFamily/instrumentFamily.model");
const InstrumentNameModel = require("../instrumentName/instrumentName.model");

exports.createInstrumentAndService = async (req, res) => {
  try {
    const { userId: UserId } = req.user;
    const { instrumentFamily, instrumentName = [], serviceName = [] } = req.body;

    const user = await User.findById(UserId);
    if (!user) {
      return res.status(status.NOT_FOUND).json({ success: false, message: "User not found" });
    }

    if (!instrumentFamily || instrumentName.length === 0 || serviceName.length === 0) {
      return res.status(status.BAD_REQUEST).json({ success: false, message: "All fields are required" });
    }

    // Step 1: Get instrument family document
    const instrumentFamilyExists = await InstrumentFamilyModel.findById(instrumentFamily);
    if (!instrumentFamilyExists) {
      return res.status(status.NOT_FOUND).json({ success: false, message: "Instrument family not found" });
    }

    // Step 2: Loop and ensure all instrumentNames exist
    const instrumentNameIds = [];
    for (let name of instrumentName) {
      let instrument = await InstrumentNameModel.findOne({ instrumentName: name });
      if (!instrument) {
        instrument = new InstrumentNameModel({
          instrumentName: name,
          instrumentFamily: instrumentFamilyExists._id,
          status: "active"
        });
        await instrument.save();
      }
      instrumentNameIds.push(instrument._id);
    }

    // Step 3: Save to InstrumentAndService collection
    const newInstrumentAndService = new InstrumentAndService({
      instrumentFamily: instrumentFamilyExists._id,
      instrumentName: instrumentNameIds,
      serviceName, // directly as string array
    });

    const saved = await newInstrumentAndService.save();

    return res.status(status.CREATED).json({
      success: true,
      message: "Instrument and service created successfully",
      data: saved
    });

  } catch (error) {
    console.error("Error in createInstrumentAndService:", error);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};
