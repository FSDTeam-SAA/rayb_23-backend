const User = require("../user/user.model");
const InstrumentFamilyModel = require("./instrumentFamily.model");
const instrumentFamilyModel = require("./instrumentFamily.model");

// Create a new instrument family
exports.createInstrumentFamily = async (req, res) => {
  try {
    const { userId: UserId } = req.user;
    const { instrumentFamily } = req.body;

    if (!instrumentFamily || !Array.isArray(instrumentFamily)) {
      return res.status(400).json({
        success: false,
        message: "instrumentFamily must be a non-empty array"
      });
    }

    const user = await User.findById(UserId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const status = user.role === "admin" ? "active" : "inactive";

    // Check if a document already exists
    const existingDoc = await InstrumentFamilyModel.findOne();

    if (existingDoc) {
      // Push new items (avoiding duplicates)
      const updated = await InstrumentFamilyModel.findByIdAndUpdate(
        existingDoc._id,
        {
          $addToSet: {
            instrumentFamily: { $each: instrumentFamily }
          }
        },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "Instrument families added to existing document",
        data: updated
      });

    } else {
      // Create new document
      const newDoc = new InstrumentFamilyModel({
        instrumentFamily,
        status
      });

      const saved = await newDoc.save();

      return res.status(201).json({
        success: true,
        message: "New instrument family document created",
        data: saved
      });
    }

  } catch (error) {
    console.error("Error in createInstrumentFamily:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};



// Get all instrument families
exports.getAllInstrumentFamilies = async (req, res) => {
    try {
        const instrumentFamilies = await instrumentFamilyModel.find();
        return res.status(200).json({
            message: "Instrument families retrieved successfully",
            data: instrumentFamilies
        });
    } catch (error) {
        console.error("Error in getAllInstrumentFamilies:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
}
;
// delete an instrument family by ID
exports.deleteInstrumentFamily = async (req, res) => {  
    try {
        const { id } = req.params;

        const deletedInstrumentFamily = await instrumentFamilyModel.findByIdAndDelete(id);
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