const Business = require("../business/business.model");
const Chat = require("../chat/chat.model");
const Message = require("../message/message.model");
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

  // 🟢 dynamic date
  let startDate = new Date();

  if (filter === "day") {
    startDate.setHours(0, 0, 0, 0);
  } else if (filter === "week") {
    startDate.setDate(startDate.getDate() - 7);
  } else if (filter === "month") {
    startDate.setMonth(startDate.getMonth() - 1);
  }

  // 🔥 get chats for this business
  const chats = await Chat.find({
    businessId: businessId,
  }).select("_id");

  const chatIds = chats.map((c) => c._id);

  // 🚀 parallel queries
  const [
    totalReviews,
    totalNewReviews,
    totalPhotos,
    newPhotos,
    newReviews,
    newMessages,
  ] = await Promise.all([
    // total reviews
    ReviewModel.countDocuments({
      business: businessId,
      status: "approved",
    }),

    // new review count
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

    // new photos
    PictureModel.countDocuments({
      business: businessId,
      status: "approved",
      createdAt: { $gte: startDate },
    }),

    // 🔥 new review list
    ReviewModel.find({
      business: businessId,
      status: "approved",
      createdAt: { $gte: startDate },
    })
      .sort({ createdAt: -1 })
      .limit(5), // latest 5

    // 🔥 new message list
    Message.find({
      chat: { $in: chatIds },
      createdAt: { $gte: startDate },
    })
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  return {
    filter,
    totalReviews,
    totalNewReviews,
    totalPhotos,
    newPhotos,
    newReviews,
    newMessages,
  };
};

const analyticsService = {
  businessManDashboardAnalytics,
};

module.exports = analyticsService;
