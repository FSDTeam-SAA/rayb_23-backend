const SavedBusinessModel = require("./SavedBusiness.model");
const User = require("../user/user.model");

// Create Saved Business
exports.createSavedBusiness = async (req, res) => {
    try {
        const { savedBusiness } = req.body;
        console.log(req.body);
        const userId = req.user.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized user" });
        }

        if (!savedBusiness) {
            return res.status(400).json({ message: "Business ID is required" });
        }

        const userExists = await User.findById(userId);
        if (!userExists) {
            return res.status(404).json({ message: "User not found" });
        }

        const alreadySaved = await SavedBusinessModel.findOne({
            savedBusiness: savedBusiness,
            user: userId
        });

        if (alreadySaved) {
            return res.status(400).json({ message: "Business already saved" });
        }

        const newSaved = new SavedBusinessModel({
            savedBusiness: savedBusiness,
            user: userId
        });

        const savedData = await newSaved.save();

        return res.status(201).json({
            message: "Business saved successfully",
            data: savedData
        });

    } catch (error) {
        console.error("Error in createSavedBusiness:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};


