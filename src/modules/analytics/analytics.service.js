const Business = require("../business/business.model");
const PictureModel = require("../picture/picture.model");
const ReviewModel = require("../review/review.model");
const User = require("../user/user.model");

const businessManDashboardAnalytics = async (email, businessId) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("User not found");
  }

  // 🔥 check business belongs to this user
  const business = await Business.findOne({
    _id: businessId,
    userId: user._id,
  });

  if (!business) {
    throw new Error("Business not found or not authorized");
  }

  // 🟢 time range for "new" (last 7 days)
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  // ✅ total review
  const totalReviews = await ReviewModel.countDocuments({
    business: businessId,
    status: "approved",
  });

  // ✅ new review
  const newReviews = await ReviewModel.countDocuments({
    business: businessId,
    createdAt: { $gte: last7Days },
    status: "approved",
  });

  // ✅ total photo (from Picture collection)
  const totalPhotos = await PictureModel.countDocuments({
    business: businessId,
    status: "approved",
  });

  // ✅ new photo
  const newPhotos = await PictureModel.countDocuments({
    business: businessId,
    status: "approved",
    createdAt: { $gte: last7Days },
  });

  return {
    totalReviews,
    newReviews,
    totalPhotos,
    newPhotos,
  };
};

const analyticsService = {
  businessManDashboardAnalytics,
};

module.exports = analyticsService;
