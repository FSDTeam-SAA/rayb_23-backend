const SavedBusinessModel = require("./SavedBusiness.model");
const User = require("../user/user.model");


// Create Saved Business
exports.createSavedBusiness = async (req, res) => {
    try {
        const { savedBusiness } = req.body;
        
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

// get saved businesses by user
exports.getSavedBusinessesByUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized user" });
    }

    const savedBusinesses = await SavedBusinessModel.find({ user: userId })
      .populate({
        path: "savedBusiness",
        populate: [
          { path: "instrumentInfo" },
          { path: "lessonServicePrice" },
          {
            path: "review",
            match: { status: "approved" },
            populate: { path: "user", select: "name email" }
          },
          { path: "user", select: "name email" }
        ]
      });

    if (savedBusinesses.length === 0) {
      return res.status(404).json({ message: "No saved businesses found" });
    }

    return res.status(200).json({
      status: true,
      message: "Saved businesses fetched successfully",
      data: savedBusinesses
    });

  } catch (error) {
    console.error("Error in getSavedBusinessesByUser:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};


//get saved business by id
exports.getSavedBusinessById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "Business ID is required" });
        }

        const savedBusiness = await SavedBusinessModel.findById(id)
            .populate("savedBusiness", "businessInfo")
            .populate("user", "name email");

        if (!savedBusiness) {
            return res.status(404).json({ message: "Saved business not found" });
        }

        return res.status(200).json({
            status: true,
            message: "Saved business fetched successfully",
            data: savedBusiness
        });

    } catch (error) {
        console.error("Error in getSavedBusinessById:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
}

// delete saved business by id
exports.deleteSavedBusiness = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "Business ID is required" });
        }

        const deletedBusiness = await SavedBusinessModel.findByIdAndDelete(id);
        if (!deletedBusiness) {
            return res.status(404).json({ message: "Saved business not found" });
        }

        return res.status(200).json({
            status: true,
            message: "Saved business deleted successfully",
            data: deletedBusiness
        });

    } catch (error) {
        console.error("Error in deleteSavedBusinessById:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
}