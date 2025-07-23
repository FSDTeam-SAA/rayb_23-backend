const Review = require("./review.model");
const Business = require("../business/business.model");
const User = require("../user/user.model");
const { sendImageToCloudinary } = require("../../utils/cloudnary"); // assume you're using this
const fs = require("fs");
const ReviewModel = require("./review.model");
const Notification = require("../notification/notification.model");



exports.createReview = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { email: userEmail } = req.user;
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one image is required",
      });
    }

    // Parse other form-data fields (rating, feedback, businessId)
    const data = JSON.parse(req.body.data);

    const { rating, feedback, business } = data;
    // const businessId = await business.findOne({ _id: business })
    if (!business) {
      return res
        .status(400)
        .json({ success: false, message: "Business ID is required" });
    }

    // Upload images to Cloudinary
    const uploadedImages = await Promise.all(
      files.map(async (file) => {
        const imageName = `reviews/${Date.now()}_${file.originalname}`;
        const { secure_url } = await sendImageToCloudinary(
          imageName,
          file.path
        );
        return secure_url;
      })
    );

    // Create review
    const review = await Review.create({
      rating,
      feedback,
      image: uploadedImages,
      business: business,
      user: user._id,
    });

    // Push review into Business model
    await Business.findByIdAndUpdate(business, {
      $push: { review: review._id },
    });

    const businessData = await Business.findById(business);


    const adminUsers = await User.find({ userType: "admin" });

    for (const admin of adminUsers) {
      const notify = await Notification.create({
        senderId: user._id,
        receiverId: admin._id,
        userType: "admin",
        type: "business_review",
        title: "New Business Review",
        message: `${user.name} added a review on a business.`,
        metadata: { businessId: business },
      });

      io.to(`admin_${admin._id}`).emit("new_notification", notify);
    }

    if (businessData?.user) {
      const ownerId = businessData.user;

      const notify = await Notification.create({
        senderId: user._id,
        receiverId: ownerId,
        userType: "businessMan",
        type: "business_review",
        title: "New Review on Your Business",
        message: `${user.name} has reviewed your business.`,
        metadata: { businessId: business, reviewId: review._id },
      });

      io.to(`businessMan_${ownerId}`).emit("new_notification", notify);
    }


    return res.status(201).json({
      status: true,
      message: "Review created successfully",
      review,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getReviewsByAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const totalReviews = await Review.countDocuments();

    const reviews = await Review.find()
      .populate("business")
      .populate("user")
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      status: true,
      message: "Review fetched successfully",
      currentPage: page,
      totalPages: Math.ceil(totalReviews / limit),
      totalItems: totalReviews,
      data: reviews,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: "Server error",
      error: err.message,
    });
  }
};

exports.getMyReviews = async (req, res) => {
  try {
    const { email } = req.user;
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("User not found");
    }

    const reviews = await Review.find({ user: user._id })
      .populate({
        path: "business",
        select: "businessInfo review",
        populate: {
          path: "review",
          select: "rating feedback image user status",
        },
      })
      .populate({
        path: "user",
        select: "name email imageLink",
      });

    return res.json({
      status: true,
      message: "Review fetched successfully",
      data: reviews,
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { email } = req.user;
    const { id } = req.params;
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("User not found");
    }

    const review = await ReviewModel.findById(id);
    if (!review) {
      throw new Error("Review not found");
    }

    const file = req.file;
    if (file) {
      const imageName = `${Date.now()}-${file.originalname}`;
      const path = file.path;
      const { secure_url } = await sendImageToCloudinary(imageName, path);
      review.image = secure_url;
    }

    const result = await ReviewModel.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    const adminUsers = await User.find({ userType: "admin" });
    const business = await Business.findById(result.business);
    const ownerId = business?.user;


    for (const admin of adminUsers) {
      const notify = await Notification.create({
        senderId: user._id,
        receiverId: admin._id,
        userType: "admin",
        type: "review_updated",
        title: "Review Updated",
        message: `${user.name || "A user"} updated a review.`,
        metadata: { businessId: business?._id, reviewId: result._id }
      });
      io.to(`admin_${admin._id}`).emit("new_notification", notify);
    }


    if (ownerId) {
      const notify = await Notification.create({
        senderId: user._id,
        receiverId: ownerId,
        userType: "businessMan",
        type: "review_updated",
        title: "A Review Was Updated",
        message: `${user.name || "A user"} updated their review on your business.`,
        metadata: { businessId: business._id, reviewId: result._id }
      });
      io.to(`businessMan_${ownerId}`).emit("new_notification", notify);
    }


    return res.json({
      status: true,
      message: "Review updated successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.toggleReview= async (req, res)=>{
  try {
    const { email: userEmail } = req.user;
    const user = await User.findOne({ email: userEmail });
    if (user.userType !== "admin") {
      return res.status(403).json({ status: false, message: "Access denied" });
    }
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      return res.status(400).json({
        status: false,
        message: "Review ID and status are required",
      });
    }

    const updatedReview = await ReviewModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedReview) {
      return res.status(404).json({
        status: false,
        message: "Review not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Review status updated successfully",
      data: updatedReview,
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
}
exports.deleteReview = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { email: userEmail } = req.user;

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        status: false,
        message: "Review ID is required",
      });
    }

    const review = await ReviewModel.findByIdAndDelete(id); 
    if (!review) {
      return res.status(404).json({
        status: false,
        message: "Review not found",
      });
    }

    const adminUsers = await User.find({ userType: "admin" });
    const business = await Business.findById(review.business); 
    const ownerId = business?.user;

    for (const admin of adminUsers) {
      const notify = await Notification.create({
        senderId: user._id,
        receiverId: admin._id,
        userType: "admin",
        type: "review_deleted",
        title: "Review Deleted",
        message: `${user.name || "A user"} deleted a review.`,
        metadata: { businessId: business?._id, reviewId: review._id },
      });
      io.to(`admin_${admin._id}`).emit("new_notification", notify);
    }

   
    if (ownerId) {
      const notify = await Notification.create({
        senderId: user._id,
        receiverId: ownerId,
        userType: "businessMan",
        type: "review_deleted",
        title: "A Review Was Deleted",
        message: `${user.name || "A user"} deleted their review on your business.`,
        metadata: { businessId: business._id, reviewId: review._id },
      });
      io.to(`businessMan_${ownerId}`).emit("new_notification", notify);
    }

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

