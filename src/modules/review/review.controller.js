const Review = require("./review.model");
const Business = require("../business/business.model");
const User = require("../user/user.model");
const { sendImageToCloudinary } = require("../../utils/cloudnary");
const fs = require("fs");
const ReviewModel = require("./review.model");
const Notification = require("../notification/notification.model");
const getTimeRange = require("../../utils/getTimeRange");

exports.createReview = async (req, res) => {
  try {
    const { email: userEmail } = req.user;
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    const files = req.files;
    const data = JSON.parse(req.body.data);

    const { rating, feedback, business } = data;
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
          file.path,
        );
        return secure_url;
      }),
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

    const admin = await User.findOne({ userType: "admin" });
    if (admin) {
      const alreadyNotified = await Notification.findOne({
        receiverId: admin._id,
        type: "new_business",
        "metadata.businessId": business._id,
      });

      if (!alreadyNotified) {
        await Notification.create({
          senderId: user ? user._id : null,
          receiverId: admin._id,
          userType: "admin",
          type: "review",
          title: "New Review on Business",
          message: `${user.name} added a review on ${businessData.businessInfo.name}.`,
          metadata: {
            businessId: business,
            reviewId: review._id,
          },
        });
      }
    }

    if (businessData?.userId) {
      const ownerId = businessData.userId;

      await Notification.create({
        senderId: user._id,
        receiverId: ownerId,
        userType: "businessMan",
        type: "business_review",
        title: "New Review on Your Business",
        message: `${user.name} has reviewed your business.`,
        metadata: { businessId: business, reviewId: review._id },
      });
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
    const { userId, userType } = req.user;

    if (userType !== "admin") {
      return res.status(403).json({
        status: false,
        message: "You are not authorized to access this resource",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // Query Parameters
    const reviewType = req.query.reviewType || "all";
    const nameSort = req.query.nameSort || "all";
    const sortBy = req.query.sortBy || "desc";
    const timeRange = req.query.timeRange || "all";

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (reviewType !== "all") {
      query.status = reviewType;
    }

    const dateFilter = getTimeRange(timeRange);
    Object.assign(query, dateFilter);

    let reviews = await Review.find(query)
      .populate("business", "businessInfo")
      .populate("user", "name email")
      .lean();

    // Sort by business name
    if (nameSort === "az") {
      reviews.sort((a, b) => {
        const nameA = a.business?.businessInfo?.name?.toLowerCase() || "";
        const nameB = b.business?.businessInfo?.name?.toLowerCase() || "";
        return nameA.localeCompare(nameB);
      });
    } else if (nameSort === "za") {
      reviews.sort((a, b) => {
        const nameA = a.business?.businessInfo?.name?.toLowerCase() || "";
        const nameB = b.business?.businessInfo?.name?.toLowerCase() || "";
        return nameB.localeCompare(nameA);
      });
    }

    // Sort by date
    if (sortBy === "asc") {
      reviews.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else {
      reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const totalItems = reviews.length;
    const paginatedReviews = reviews.slice(skip, skip + limit);

    return res.status(200).json({
      status: true,
      message: "Reviews fetched successfully",
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      data: paginatedReviews,
    });
  } catch (err) {
    console.error("Error in getReviewsByAdmin:", err.message);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

exports.getMyReviews = async (req, res) => {
  try {
    const { email } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // Total count for pagination
    const totalReviews = await Review.countDocuments({ user: user._id });

    // Fetch paginated reviews
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
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // optional: latest reviews first

    return res.json({
      status: true,
      message: "Reviews fetched successfully",
      data: reviews,
      meta: {
        page,
        limit,
        totalReviews,
        totalPages: Math.ceil(totalReviews / limit),
      },
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
        metadata: { businessId: business?._id, reviewId: result._id },
      });
      io.to(`${admin._id}`).emit("new_notification", notify);
    }

    if (ownerId) {
      const notify = await Notification.create({
        senderId: user._id,
        receiverId: ownerId,
        userType: "businessMan",
        type: "review_updated",
        title: "A Review Was Updated",
        message: `${
          user.name || "A user"
        } updated their review on your business.`,
        metadata: { businessId: business._id, reviewId: result._id },
      });
      io.to(`${ownerId}`).emit("new_notification", notify);
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

exports.toggleReview = async (req, res) => {
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

    // ✅ Get the review first
    const review = await ReviewModel.findById(id);
    if (!review) {
      return res
        .status(404)
        .json({ status: false, message: "Review not found" });
    }

    // ✅ Get the business from the review
    const business = await Business.findById(review.business);
    const ownerId = business?.userId;

    if (ownerId) {
      await Notification.create({
        senderId: user._id,
        receiverId: ownerId,
        userType: "businessMan",
        type: "review_updated",
        title: "A Review Was Updated",
        message:
          status === "approved"
            ? "Your review has been approved by the admin."
            : "Your review has been rejected by the admin.",
        metadata: { businessId: business._id, reviewId: review._id },
      });
    }

    // ✅ Update after notification logic
    const updatedReview = await ReviewModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    return res.status(200).json({
      status: true,
      message: "Review status updated successfully",
      data: updatedReview,
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

exports.reportReview = async (req, res) => {
  try {
    const { email } = req.user;
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        status: false,
        message: "Report message is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    const review = await ReviewModel.findById(id);
    if (!review) {
      return res
        .status(404)
        .json({ status: false, message: "Review not found" });
    }

    // Prevent self-reporting
    if (String(review.user) === String(user._id)) {
      return res.status(403).json({
        status: false,
        message: "You cannot report your own review",
      });
    }

    const business = await Business.findById(review.business);
    if (!business) {
      return res
        .status(404)
        .json({ status: false, message: "Business not found" });
    }

    // Prevent business owner from reporting review on own business
    if (String(business.user) === String(user._id)) {
      return res.status(403).json({
        status: false,
        message: "You cannot report a review on your own business",
      });
    }

    // Update review with report
    review.report = {
      isReport: true,
      message,
    };
    await review.save();

    const admin = await User.findOne({ userType: "admin" });
    if (admin) {
      const alreadyNotified = await Notification.findOne({
        receiverId: admin._id,
        type: "new_business",
        "metadata.businessId": business._id,
      });

      if (!alreadyNotified) {
        await Notification.create({
          senderId: user ? user._id : null,
          receiverId: admin._id,
          userType: "admin",
          type: "review",
          title: "A Review Was Reported",
          message: `${user.name} reported a review on ${business.businessInfo.name}.`,
          metadata: {
            businessId: business,
            reviewId: review._id,
          },
        });
      }
    }

    return res.status(200).json({
      status: true,
      message: "Review reported successfully and notifications sent",
      data: review,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.deleteReview = async (req, res) => {
  try {
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

    const business = await Business.findById(review.business);
    const ownerId = business?.userId;

    const admin = await User.findOne({ userType: "admin" });
    if (admin) {
      const alreadyNotified = await Notification.findOne({
        receiverId: admin._id,
        type: "new_business",
        "metadata.businessId": business._id,
      });

      if (!alreadyNotified) {
        await Notification.create({
          senderId: user ? user._id : null,
          receiverId: admin._id,
          userType: "admin",
          type: "review",
          title: "A Review Was Deleted",
          message: `${user.name} deleted a review on ${business.businessInfo.name}.`,
          metadata: {
            businessId: business,
            reviewId: review._id,
          },
        });
      }
    }

    if (ownerId) {
      await Notification.create({
        senderId: user._id,
        receiverId: ownerId,
        userType: "businessMan",
        type: "review_deleted",
        title: "A Review Was Deleted",
        message: `${
          user.name || "A user"
        } deleted their review on your business.`,
        metadata: { businessId: business._id, reviewId: review._id },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getReviewsByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const business = await Business.findById(businessId);
    if (!business) {
      return res
        .status(404)
        .json({ success: false, message: "Business not found" });
    }

    const reviews = await ReviewModel.find({ business: businessId }).populate({
      path: "user",
      select: "name email imageLink",
    });
    return res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addReplyMyBusinessReview = async (req, res) => {
  try {
    const { email } = req.user;
    const { reply } = req.body;
    const { id: reviewId } = req.params;

    if (!reviewId) {
      return res.status(400).json({
        success: false,
        message: "Review ID is required",
      });
    }

    if (!reply || typeof reply !== "string" || !reply.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply text is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const review = await ReviewModel.findById(reviewId)
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Only business owner can reply
    if (String(review.business.userId) !== String(user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to reply to this review",
      });
    }

    // 🚨 HARD SAFETY (prevents future crashes)
    if (!Array.isArray(review.reply)) {
      review.reply = [];
    }

    review.reply.push({
      text: reply.trim(),
      repliedBy: user._id,
      repliedAt: new Date(),
    });

    await review.save();

    return res.status(200).json({
      success: true,
      message: "Reply added successfully",
      data: review,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
