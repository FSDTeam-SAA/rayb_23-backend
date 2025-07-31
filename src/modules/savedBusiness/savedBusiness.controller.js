const SavedBusinessModel = require("./SavedBusiness.model");
const User = require("../user/user.model");
const Business = require("../business/business.model");
const Notification = require("../notification/notification.model");

// Create Saved Business
exports.createSavedBusiness = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { savedBusiness } = req.body;

    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }



    if (!savedBusiness) {
      return res.status(400).json({ message: "Business ID is required" });
    }



    const alreadySaved = await SavedBusinessModel.findOne({
      savedBusiness: savedBusiness,
      user: userId,
    });

    if (alreadySaved) {
      throw new Error("Business already saved");
    }

    const newSaved = new SavedBusinessModel({
      savedBusiness: savedBusiness,
      user: userId,
    });

    const savedData = await newSaved.save();


    const business = await Business.findById(savedBusiness);
    const businessOwner = business.userId;
    const businessId = business._id;

  
    if (businessOwner && businessOwner._id.toString() !== userId) {
      const notifyOwner = await Notification.create({
        senderId: user._id,
        receiverId: businessOwner._id,
        userType: "businessMan",
        type: "business_saved",
        title: "Business Saved",
        message: `${user.name} has saved your business "${business.businessInfo.name}"`,
        metadata: { businessId: businessId },
      });

      io.to(`${businessOwner._id}`).emit("new_notification", notifyOwner);
    }

   
    const admins = await User.find({ userType: "admin" });
    for (const admin of admins) {
      const notifyAdmin = await Notification.create({
        senderId: user._id,
        receiverId: admin._id,
        userType: "admin",
        type: "business_saved",
        title: "Business Saved",
        message: `${user.name} has saved a business "${business.businessInfo.name}"`,
        metadata: { businessId: businessId },
      });

      io.to(`${admin._id}`).emit("new_notification", notifyAdmin);
    }


    return res.status(201).json({
      message: "Business saved successfully",
      data: savedData,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ code: 500, status: false, message: error.message });
  }
};

// get saved businesses by user
exports.getSavedBusinessesByUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }


    const savedBusinesses = await SavedBusinessModel.find({ user: userId })
      // .populate({
      //   path: "savedBusiness",
      //   populate: [
      //     { path: "instrumentInfo" },
      //     { path: "lessonServicePrice" },
      //     {
      //       path: "review",
      //       match: { status: "approved" },
      //       populate: { path: "user", select: "name email" },
      //     },
      //     { path: "user", select: "name email" },
      //   ],
      // })
      .populate("savedBusiness")
      .populate("user", "name email");

    if (savedBusinesses.length === 0) {
      return res.status(200).json({ message: "No saved businesses found" });
    }

    return res.status(200).json({
      status: true,
      message: "Saved businesses fetched successfully",
      data: savedBusinesses,
    });
  } catch (error) {
    console.error("Error in getSavedBusinessesByUser:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
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
      .populate({
        path: "savedBusiness",
        populate: [
          { path: "instrumentInfo" },
          { path: "lessonServicePrice" },
          {
            path: "review",
            match: { status: "approved" },
            populate: { path: "user", select: "name email" },
          },
          { path: "user", select: "name email" },
        ],
      })
      .populate("user", "name email");

    if (!savedBusiness) {
      return res.status(404).json({ message: "Saved business not found" });
    }

    return res.status(200).json({
      status: true,
      message: "Saved business fetched successfully",
      data: savedBusiness,
    });
  } catch (error) {
    console.error("Error in getSavedBusinessById:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

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
      data: deletedBusiness,
    });
  } catch (error) {
    console.error("Error in deleteSavedBusinessById:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
