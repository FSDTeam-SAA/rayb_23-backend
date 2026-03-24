const Business = require("../business/business.model");
const PictureModel = require("../picture/picture.model");
const ReviewModel = require("../review/review.model");
const User = require("../user/user.model");

const businessManDashboardAnalytics = async (
  email,
  businessId,
  filter = "day",
) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("User not found");
  }

  const business = await Business.findOne({
    _id: businessId,
    userId: user._id,
  });

  if (!business) {
    throw new Error("Business not found or not authorized");
  }

  // 🔥 dynamic date range
  let startDate = new Date();

  if (filter === "day") {
    startDate.setHours(0, 0, 0, 0);
  } else if (filter === "week") {
    startDate.setDate(startDate.getDate() - 7);
  } else if (filter === "month") {
    startDate.setMonth(startDate.getMonth() - 1);
  }

  // 🚀 parallel queries (fast)
  const [totalReviews, newReviews, totalPhotos, newPhotos] = await Promise.all([
    // total reviews
    ReviewModel.countDocuments({
      business: businessId,
      status: "approved",
    }),

    // filtered reviews
    ReviewModel.countDocuments({
      business: businessId,
      status: "approved",
      createdAt: { $gte: startDate },
    }),

    // total photos
    PictureModel.countDocuments({
      business: businessId,
      status: "approved",
    }),

    // filtered photos
    PictureModel.countDocuments({
      business: businessId,
      status: "approved",
      createdAt: { $gte: startDate },
    }),
  ]);

  return {
    filter, 
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
