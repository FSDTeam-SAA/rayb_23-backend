const SavedBusinessModel = require ("./SavedBusiness.model");
const User = require("../user/user.model");

// create saved business
exports.createSavedBusiness = async (req, res) => {
    try {
        const { businessId } = req.body;
        const userId = req.user._id;

        // Check if the business is already saved by the user
        const existingSavedBusiness = await SavedBusinessModel.findOne({
            savedBusiness: businessId,
            user: userId
        });

        if (existingSavedBusiness) {
            return res.status(400).json({ message: "Business already saved" });
        }

        // Create a new saved business entry
        const newSavedBusiness = new SavedBusinessModel({
            savedBusiness: businessId,
            user: userId
        });

        await newSavedBusiness.save();

        res.status(201).json({ message: "Business saved successfully", data: newSavedBusiness });
    } catch (error) {
        console.error("Error saving business:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};