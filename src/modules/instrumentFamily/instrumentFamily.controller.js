const instrumentFamilyModel = require("./instrumentFamily.model");

// Create a new instrument family
exports.createInstrumentFamily = async (req, res) => {
    try {
        const { userId } = req.user;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized user" });
        }
        const { instrumentFamily } = req.body;

        if (!instrumentFamily || !Array.isArray(instrumentFamily) || instrumentFamily.length === 0) {
            return res.status(400).json({ message: "Instrument family is required and must be an array" });
        }

        const newInstrumentFamily = new instrumentFamilyModel({ instrumentFamily });
        const savedInstrumentFamily = await newInstrumentFamily.save();

        return res.status(201).json({
            message: "Instrument family created successfully",
            data: savedInstrumentFamily
        });
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