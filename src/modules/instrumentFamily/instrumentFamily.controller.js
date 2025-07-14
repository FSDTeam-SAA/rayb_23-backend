const User = require("../user/user.model");
const InstrumentFamilyModel = require("./instrumentFamily.model");



// Create a new instrument family
exports.createInstrumentFamily = async (req, res) => {
  try {
    const { userId: UserId } = req.user;
    const { instrumentFamily } = req.body;
    const user = await User.findById(UserId);
    console.log(user);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const status = user.userType === "admin" ? "active" : "inactive";

    // Filter out duplicates by checking if name already exists
    const createdFamilies = [];

    for (const name of instrumentFamily) {
      const exists = await InstrumentFamilyModel.findOne({ instrumentFamily: name });
      if (!exists) {
        const newFamily = new InstrumentFamilyModel({
          instrumentFamily: name,
          status
        });
        const saved = await newFamily.save();
        createdFamilies.push(saved);
      }
    }

    if (createdFamilies.length === 0) {
      return res.status(200).json({
        success: true,
        message: "All instrument families already exist",
        data: []
      });
    }

    return res.status(201).json({
      success: true,
      message: "Instrument families created successfully",
      data: createdFamilies
    });

  } catch (error) {
    console.error("Error in createInstrumentFamily:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};



// Get all instrument families
exports.getAllInstrumentFamilies = async (req, res) => {
    try {
        const instrumentFamilies = await InstrumentFamilyModel.find();
        res.status(200).json({
            status: true,
            message: 'Instrument families fetched successfully',
            data: instrumentFamilies
        })
    }
    catch (error) {
        console.error("Error in deleteInstrumentFamily:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

//update
exports.updateInstrumentFamily = async (req, res) => {
  try {
    const { userId: UserId } = req.user;
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'active' or 'inactive'"
      });
    }

    const user = await User.findById(UserId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const updated = await InstrumentFamilyModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Instrument family not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Instrument family status updated successfully",
      data: updated
    });

  } catch (error) {
    console.error("Error in updateInstrumentFamily:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};


// delete an instrument family by ID
exports.deleteInstrumentFamily = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedInstrumentFamily = await InstrumentFamilyModel.findByIdAndDelete(id);
        if (!deletedInstrumentFamily) {
            return res.status(404).json({ message: "Instrument family not found" });
        }

        return res.status(200).json({
            message: "Instrument family deleted successfully",
            data: deletedInstrumentFamily
        });
    } catch (error) {
        console.error("Error in deleteInstrumentFamily:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};