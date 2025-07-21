const PictureModel = require("./picture.model");
const User = require("../user/user.model");
const BusinessModel = require("../business/business.model");
const {
  createNotification,
  createNotificationAdmin,
} = require("../../utils/createNotification");
const { sendImageToCloudinary } = require("../../utils/cloudnary");
const sendNotiFication = require("../../utils/sendNotification");
const { default: status } = require("http-status");

exports.uploadPicture = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { email: userEmail, userId: userID } = req.user;
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        code: 500,
        message: "At least one image is required",
      });
    }
    const data = JSON.parse(req.body.data);
    console.log(data);
    if (!data.business) {
      return res
        .status(400)
        .json({ success: false, message: "Business ID is required" });
    }

    // Upload images to Cloudinary
    const uploadedImages = await Promise.all(
      files.map(async (file) => {
        const imageName = `Picture/${Date.now()}_${file.originalname}`;
        const { secure_url } = await sendImageToCloudinary(
          imageName,
          file.path
        );
        return secure_url;
      })
    );
    const newPictures = new PictureModel({
      image: uploadedImages,
      business: data.business,
      user: userID,
    });
    const picture = await newPictures.save();

    await BusinessModel.findByIdAndUpdate(data.business, {
      $push: { reviewImage: picture._id },
    });

    const message1 = `${user.name} has added a new picture as review`;
    const message2 = `You have added a new picture as review`;
    const saveNotification = await createNotification(
      userID,
      message2,
      "Review Picture"
    );
    const saveNotificationAdmin = await createNotificationAdmin(
      userID,
      message1,
      "Review Picture"
    );

    await sendNotiFication(io, req, saveNotification, saveNotificationAdmin);

    res.app.get("io").emit("new-picture", picture);

    return res.status(201).json({
      status: true,
      message: "Picture Uploaded successfully",
      picture,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "server error",
      error: error.message,
    });
  }
};

// Get all pictures
exports.getAllPicturesAdmin = async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await User.findById(userId);
    if (user.userType !== "admin") {
      return res.status(403).json({
        status: false,
        message: "You are not authorized to access this resource",
      });
    }
    const pictures = await PictureModel.find()
      .populate("user", "name email")
      .populate("business", "businessInfo");
    if (!pictures || pictures.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No pictures found",
      });
    }
    return res.status(200).json({
      status: true,
      message: "Pictures fetched successfully",
      data: pictures,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// get all Pictures by user

exports.getAllPicturesByUser = async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }
    const pictures = await PictureModel.find({ user: userId }).populate(
      "business",
      "businessInfo"
    );
    // if (!pictures || pictures.length === 0) {
    //   return res.status(200).json({
    //     status: false,
    //     message: "No pictures found for this user",
    //   });
    // }
    return res.status(200).json({
      status: true,
      message: "Pictures fetched successfully",
      data: pictures,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

//git picture by business id
exports.getPictureByBusinessId = async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }
    const { businessId } = req.params;
    const pictures = await PictureModel.find({ business: businessId }).populate(
      "user",
      "name email"
    );
    if (!pictures || pictures.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No pictures found for this business",
      });
    }
    return res.status(200).json({
      status: true,
      message: "Pictures fetched successfully",
      data: pictures,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get picture by ID
exports.getPictureById = async (req, res) => {
  try {
    const { id } = req.params;
    const picture = await PictureModel.findById(id)
      .populate("user", "name email")
      .populate("business", "businessInfo");
    if (!picture) {
      return res.status(404).json({
        status: false,
        message: "Picture not found",
      });
    }
    return res.status(200).json({
      status: true,
      message: "Picture fetched successfully",
      data: picture,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

//Update picture by ID
exports.updatePictureById = async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }
    const { id } = req.params;
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        status: false,
        message: "Image is required",
      });
    }

    const updatedPicture = await PictureModel.findByIdAndUpdate(
      id,
      { image },
      { new: true }
    )
      .populate("user", "name email")
      .populate("business", "businessInfo");

    if (!updatedPicture) {
      return res.status(404).json({
        status: false,
        message: "Picture not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Picture updated successfully",
      data: updatedPicture,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Delete picture by ID
exports.deletedPicture = async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }
    const { id } = req.params;
    const deletedPicture = await PictureModel.findByIdAndDelete(id);
    if (!deletedPicture) {
      return res.status(404).json({
        status: false,
        message: "Picture not found",
      });
    }
    return res.status(200).json({
      status: true,
      message: "Picture deleted successfully",
      data: deletedPicture,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
