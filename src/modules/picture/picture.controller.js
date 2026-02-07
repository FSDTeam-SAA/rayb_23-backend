const PictureModel = require("./picture.model");
const User = require("../user/user.model");
const BusinessModel = require("../business/business.model");
const { sendImageToCloudinary } = require("../../utils/cloudnary");
const Notification = require("../notification/notification.model");
const getTimeRange = require("../../utils/getTimeRange");

exports.uploadPicture = async (req, res) => {
  try {
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
          file.path,
        );
        return secure_url;
      }),
    );
    const newPictures = new PictureModel({
      image: uploadedImages,
      business: data.business,
      user: userID,
    });
    const picture = await newPictures.save();

    await BusinessModel.findByIdAndUpdate(
      { _id: data.business },
      {
        $push: { reviewImage: picture._id },
      },
    );

    const business = await BusinessModel.findById({ _id: data.business });
    if (!business) {
      return res.status(404).json({
        status: false,
        message: "Business not found",
      });
    }

    const admin = await User.findOne({ userType: "admin" });
    if (admin) {
      const alreadyNotified = await Notification.findOne({
        receiverId: admin._id,
        type: "review_image_uploaded",
        metadata: {
          businessId: data.business,
          pictureId: picture._id,
        },
      });

      if (!alreadyNotified) {
        await Notification.create({
          senderId: user._id,
          receiverId: admin._id,
          userType: "admin",
          type: "review_image_uploaded",
          title: "New Picture Uploaded",
          message: `${
            user.name || "A User"
          } uploaded a new picture for business: ${
            business.businessInfo.name || ""
          }`,
          metadata: {
            businessId: data.business,
            pictureId: picture._id,
          },
        });
      }
    }

    const owner = business.userId;
    if (owner) {
      const alreadyNotified = await Notification.findOne({
        receiverId: owner._id,
        type: "review_image_uploaded",
        metadata: {
          businessId: data.business,
          pictureId: picture._id,
        },
      });

      if (!alreadyNotified) {
        // ---------- Create Notification ----------
        await Notification.create({
          senderId: user._id,
          receiverId: owner._id,
          userType: "businessMan",
          type: "review_image_uploaded",
          title: "New Picture Uploaded",
          message: `${
            user.name || "A User"
          } uploaded a new picture for business: ${
            business.businessInfo.name || ""
          }`,
          metadata: {
            businessId: data.business,
            pictureId: picture._id,
          },
        });
      }
    }

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

exports.getAllPicturesAdmin = async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await User.findById(userId);

    if (!user || user.userType !== "admin") {
      return res.status(403).json({
        status: false,
        message: "You are not authorized to access this resource",
      });
    }

    const photoType = req.query.photoType || "all";
    const sortBy = req.query.sortBy || "desc";
    const nameSort = req.query.nameSort || "all";
    const timeRange = req.query.timeRange || "all";

    const query = {};
    if (photoType !== "all") {
      query.status = photoType;
    }

    const dateRange = getTimeRange(timeRange);
    Object.assign(query, dateRange);

    let pictures = await PictureModel.find(query)
      .populate("user", "name email")
      .populate("business", "businessInfo");

    if (nameSort === "az") {
      pictures.sort((a, b) => {
        const nameA = a.business?.businessInfo?.name?.toLowerCase() || "";
        const nameB = b.business?.businessInfo?.name?.toLowerCase() || "";
        return nameA.localeCompare(nameB);
      });
    } else if (nameSort === "za") {
      pictures.sort((a, b) => {
        const nameA = a.business?.businessInfo?.name?.toLowerCase() || "";
        const nameB = b.business?.businessInfo?.name?.toLowerCase() || "";
        return nameB.localeCompare(nameA);
      });
    }

    // 🟡 Sort by createdAt
    if (sortBy === "asc") {
      pictures.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else {
      pictures.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return res.status(200).json({
      status: true,
      message: "Pictures fetched successfully",
      total: pictures.length,
      data: pictures,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getAllPicturesByUser = async (req, res) => {
  try {
    const { userId } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // Get all pictures of the user with business info
    const pictures = await PictureModel.find({ user: userId }).populate(
      "business",
      "businessInfo",
    );

    // Group pictures by business
    const groupedByBusiness = pictures.reduce((acc, pic) => {
      const businessId = pic.business._id.toString();

      if (!acc[businessId]) {
        acc[businessId] = {
          business: pic.business,
          images: [],
        };
      }

      // Push image object with _id, url, and status
      pic.image.forEach((imgUrl) => {
        acc[businessId].images.push({
          _id: pic._id,
          url: imgUrl,
          status: pic.status,
        });
      });

      return acc;
    }, {});

    // Convert object to array
    const result = Object.values(groupedByBusiness);

    // Pagination
    const paginatedResult = result.slice(skip, skip + limit);

    return res.status(200).json({
      status: true,
      message: "Pictures fetched successfully",
      data: paginatedResult,
      meta: {
        page,
        limit,
        totalBusinesses: result.length,
        totalPages: Math.ceil(result.length / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getPictureByBusinessId = async (req, res) => {
  try {
    const { businessId } = req.params;
    const pictures = await PictureModel.find({ business: businessId }).populate(
      "user",
      "name email",
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

exports.updatePictureById = async (req, res) => {
  try {
    const io = req.app.get("io");
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
      { new: true },
    )
      .populate("user", "name email")
      .populate("business", "businessInfo");

    if (!updatedPicture) {
      return res.status(404).json({
        status: false,
        message: "Picture not found",
      });
    }

    const business = updatedPicture.business;

    if (business?.user) {
      const notifyBusinessOwner = await Notification.create({
        senderId: user._id,
        receiverId: business.user,
        userType: "businessMan",
        type: "review_image_updated",
        title: "Review Image Updated",
        message: `${user.name} updated a review image for your business.`,
        metadata: {
          businessId: business._id,
          pictureId: updatedPicture._id,
        },
      });

      io.to(`${business.user._id}`).emit(
        "new_notification",
        notifyBusinessOwner,
      );
    }

    // Notify all Admins
    const admins = await User.find({ userType: "admin" });
    for (const admin of admins) {
      const notifyAdmin = await Notification.create({
        senderId: user._id,
        receiverId: admin._id,
        userType: "admin",
        type: "review_image_updated",
        title: "Picture Updated",
        message: `${user.name} updated a review image for business: ${
          business.businessInfo?.businessName || "N/A"
        }`,
        metadata: {
          businessId: business._id,
          pictureId: updatedPicture._id,
        },
      });

      io.to(`${admin._id}`).emit("new_notification", notifyAdmin);
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

exports.deletedPicture = async (req, res) => {
  try {
    const io = req.app.get("io");
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

    const business = deletedPicture.business;

    // Notify Business Owner
    if (business?.user) {
      const notifyBusinessOwner = await Notification.create({
        senderId: user._id,
        receiverId: business.user,
        userType: "businessMan",
        type: "review_image_deleted",
        title: "Review Image Deleted",
        message: `${user.name} deleted a review image from your business.`,
        metadata: {
          businessId: business._id,
          pictureId: deletedPicture._id,
        },
      });

      io.to(`${business.user._id}`).emit(
        "new_notification",
        notifyBusinessOwner,
      );
    }

    // Notify all Admins
    const admins = await User.find({ userType: "admin" });
    for (const admin of admins) {
      const notifyAdmin = await Notification.create({
        senderId: user._id,
        receiverId: admin._id,
        userType: "admin",
        type: "review_image_deleted",
        title: "Picture Deleted",
        message: `${user.name} deleted a review image from business: ${
          business.businessInfo?.businessName || "N/A"
        }`,
        metadata: {
          businessId: business._id,
          pictureId: deletedPicture._id,
        },
      });

      io.to(`${admin._id}`).emit("new_notification", notifyAdmin);
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

exports.togglePictureStatus = async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await User.findById(userId);

    if (user?.userType !== "admin") {
      return res.status(403).json({
        status: false,
        message: "access denied.",
      });
    }
    const { id } = req.params;
    const { status } = req.body;
    const picture = await PictureModel.findById(id);
    if (!picture) {
      return res.status(404).json({
        status: false,
        message: "Picture not found",
      });
    }
    picture.status = status;
    await picture.save();

    // Send notification to uploader
    if (picture.user) {
      await Notification.create({
        senderId: req.user.userId,
        receiverId: picture.user,
        userType: "user",
        type: "picture_status_update",
        title: "Picture Status Changed",
        message: `Your uploaded picture's status has been updated to "${status}".`,
        metadata: {
          pictureId: picture._id,
          newStatus: status,
        },
      });
    }

    return res.status(200).json({
      status: true,
      message: "Picture status updated successfully",
      data: picture,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
      error,
    });
  }
};
