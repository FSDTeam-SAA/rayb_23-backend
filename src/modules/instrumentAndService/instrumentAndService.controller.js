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

exports.getAllInstrumentAndServices = async (req, res) => {
  try {
const { search = "" } = req.query;

    const page = parseInt(req.query.page) || 1; // default page = 1
    const limit = parseInt(req.query.limit) || 10; // default limit = 10
    const skip = (page - 1) * limit;

    const instrumentAndServices = await InstrumentAndService.find()
      .populate("instrumentFamily", "instrumentFamily")
      .populate("instrumentName", "instrumentName")
      .select("-__v")
      .skip(skip)
      .limit(limit)
        .sort({ createdAt: -1 })
        .lean();
    if (search) {
        instrumentAndServices = instrumentAndServices.filter(item =>
            item.instrumentFamily.instrumentFamily.toLowerCase().includes(search.toLowerCase()) ||
            item.instrumentName.some(name => name.instrumentName.toLowerCase().includes(search.toLowerCase())) ||
            item.serviceName.some(service => service.toLowerCase().includes(search.toLowerCase()))
        );
        }
    const total = await InstrumentAndService.countDocuments();
    const totalPages = Math.ceil(total / limit);
    const pagination = {
      totalItems: total,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
    if (instrumentAndServices.length === 0) {
      return res.status(status.NOT_FOUND).json({
        success: false,
        message: "No instrument and services found",
        data: []
      });
    }
    return res.status(status.OK).json({
      success: true,
      message: "Instrument and services fetched successfully",
      data: instrumentAndServices,
      pagination
    });

  } catch (error) {
    console.error("Error in getAllInstrumentAndServices:", error);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
}

exports.getAllInstrumentAndServicesByFamily = async (req, res) => {
  try {
    const { instrumentFamilyId } = req.params;

    if (!instrumentFamilyId) {
      return res.status(status.BAD_REQUEST).json({ success: false, message: "Instrument family ID is required" });
    }

    const instrumentAndServices = await InstrumentAndService.find({ instrumentFamily: instrumentFamilyId })
      .populate("instrumentFamily", "instrumentFamily")
      .populate("instrumentName", "instrumentName")
      .select("-__v");

    if (instrumentAndServices.length === 0) {
      return res.status(status.NOT_FOUND).json({
        success: false,
        message: "No instrument and services found for this family",
        data: []
      });
    }

    return res.status(status.OK).json({
      success: true,
      message: "Instrument and services fetched successfully",
      data: instrumentAndServices
    });

  } catch (error) {
    console.error("Error in getAllInstrumentAndServicesByFamily:", error);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
} 

exports.updateInstrumentAndService = async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params; // _id of InstrumentAndService to update
    const { instrumentFamily, instrumentName = [], serviceName = [] } = req.body;

    // Step 1: Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(status.NOT_FOUND).json({ success: false, message: "User not found" });
    }

    if (user.userType !== "admin") {
      return res.status(status.FORBIDDEN).json({ success: false, message: "Forbidden" });
    }

    // Step 2: Validate instrumentFamily
    const instrumentFamilyExists = await InstrumentFamilyModel.findById(instrumentFamily);
    if (!instrumentFamilyExists) {
      return res.status(status.NOT_FOUND).json({ success: false, message: "Instrument family not found" });
    }

    // Step 3: Get existing document
    const existing = await InstrumentAndService.findById(id);
    if (!existing) {
      return res.status(status.NOT_FOUND).json({ success: false, message: "Instrument and service not found" });
    }

    // Step 4: Remove old instrument names
    if (existing.instrumentName && existing.instrumentName.length > 0) {
      await InstrumentNameModel.deleteMany({ _id: { $in: existing.instrumentName } });
    }

    // Step 5: Create new instrument names if not exist
    const instrumentNameIds = [];
    for (let name of instrumentName) {
      let instrument = await InstrumentNameModel.findOne({ instrumentName: name });
      if (!instrument) {
        instrument = new InstrumentNameModel({
          instrumentName: name,
          status: "active",
        });
        await instrument.save();
      }
      instrumentNameIds.push(instrument._id);
    }

    // Step 6: Update the document
    existing.instrumentFamily = instrumentFamilyExists._id;
    existing.instrumentName = instrumentNameIds;
    existing.serviceName = serviceName;

    const updated = await existing.save();

    return res.status(status.OK).json({
      success: true,
      message: "Instrument and service updated successfully",
      data: updated,
    });

  } catch (error) {
    console.error("Error in updateInstrumentAndService:", error);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.deleteInstrumentAndService = async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params; // this is the _id of InstrumentAndService

    const user = await User.findById(userId);
    if (!user) {
      return res.status(status.NOT_FOUND).json({ success: false, message: "User not found" });
    }

    if (user.userType !== "admin") {
      return res.status(status.FORBIDDEN).json({ success: false, message: "Forbidden" });
    }

    // Step 1: Find the document
    const instrumentService = await InstrumentAndService.findById(id);
    if (!instrumentService) {
      return res.status(status.NOT_FOUND).json({ success: false, message: "Instrument and service not found" });
    }

    // Step 2: Delete associated InstrumentName(s)
    if (instrumentService.instrumentName && instrumentService.instrumentName.length > 0) {
      await InstrumentNameModel.deleteMany({ _id: { $in: instrumentService.instrumentName } });
    }

    // Step 3: Delete the main document
    await InstrumentAndService.findByIdAndDelete(id);

    return res.status(status.OK).json({
      success: true,
      message: "Instrument and service deleted successfully",
    });

  } catch (error) {
    console.error("Error in deleteInstrumentAndService:", error);
    return res.status(status.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};