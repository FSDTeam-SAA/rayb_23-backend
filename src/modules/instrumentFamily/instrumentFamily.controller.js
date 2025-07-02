const User = require("../user/user.model");
const InstrumentFamilyModel = require("./instrumentFamily.model");

// Create a new instrument family
exports.createInstrumentFamily = async (req, res) => {
  try {
    const { userId: UserId } = req.user;
    const { instrumentFamily } = req.body;



    const user = await User.findById(UserId);
<<<
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