const { sendImageToCloudinary } = require("../../utils/cloudnary");
const { LessonService } = require("../lessonService/lessonService.model");
const User = require("../user/user.model");
const fs = require("fs");
const Business = require("./business.model");
const ReviewModel = require("../review/review.model");
const PictureModel = require("../picture/picture.model");
const ClaimBussiness = require("../claimBussiness/claimBussiness.model");
const ServiceOffered = require("../serviceOffered/serviceOffered.model");
const { default: mongoose } = require("mongoose");
const MusicLesson = require("../musicLesson/musicLesson.model");

exports.createBusiness = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { email, userType } = req.user;
    const { services, businessInfo, businessHours, ...rest } = req.body;
    const files = req.files;

    // find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const ownerField = userType === "admin" ? "adminId" : "user";

    // Validate and fetch services
    let validServiceIds = [];
    if (services && Array.isArray(services) && services.length > 0) {
      if (!services.every((id) => mongoose.Types.ObjectId.isValid(id))) {
        return res.status(400).json({
          success: false,
          error:
            "One or more service IDs are invalid. Must be valid 24-character ObjectIds.",
        });
      }

      const servicesFromDB = await ServiceOffered.find({
        _id: { $in: services },
      }).select("_id");

      validServiceIds = servicesFromDB.map((s) => s._id);
    }

    // Validate and fetch musicLessons
    let validMusicLessonIds = [];
    if (
      rest.musicLessons &&
      Array.isArray(rest.musicLessons) &&
      rest.musicLessons.length > 0
    ) {
      if (
        !rest.musicLessons.every((id) => mongoose.Types.ObjectId.isValid(id))
      ) {
        return res.status(400).json({
          success: false,
          error:
            "One or more music lesson IDs are invalid. Must be valid 24-character ObjectIds.",
        });
      }

      const musicLessonsFromDB = await MusicLesson.find({
        _id: { $in: rest.musicLessons },
      }).select("_id");

      if (musicLessonsFromDB.length !== rest.musicLessons.length) {
        return res.status(400).json({
          success: false,
          error: "Some music lessons do not exist in the database.",
        });
      }

      validMusicLessonIds = musicLessonsFromDB.map((ml) => ml._id);
    }

    // Upload images if provided
    let image = [];
    if (files && Array.isArray(files) && files.length > 0) {
      image = await Promise.all(
        files.map(async (file) => {
          const imageName = `business/${Date.now()}_${file.originalname}`;
          const result = await sendImageToCloudinary(imageName, file.path);
          return result.secure_url;
        })
      );
    }

    const newBusinessInfo = {
      ...businessInfo,
      ...(image.length > 0 ? { image } : {}),
    };

    const newBusiness = await Business.create({
      ...rest,
      [ownerField]: user._id,
      services: validServiceIds,
      businessInfo: newBusinessInfo,
      musicLessons: validMusicLessonIds,
      businessHours: businessHours || [],
    });

    // optionally, link business to user
    await User.findByIdAndUpdate(user._id, {
      $push: { businesses: newBusiness._id },
    });

    const populatedBusiness = await Business.findById(newBusiness._id)
      .populate("user", "name email")
      .populate("adminId", "name email")
      .populate("services") // show full service docs
      .populate("musicLessons")
      .populate("review");

    // Notify all Admins
    const admins = await User.find({ userType: "admin" });
    for (const admin of admins) {
      const adminNotification = await Notification.create({
        senderId: user._id,
        receiverId: admin._id,
        userType: "admin",
        type: "business_create",
        title: "New Business Submitted",
        message: `${user.name} submitted a new business: ${
          businessInfo?.name || "Unnamed"
        }`,
        metadata: {
          businessId: newBusiness._id,
        },
      });

      io.to(`admin_${admin._id}`).emit("new_notification", adminNotification);
    }

    //  Notify user (if not admin)
    if (userType !== "admin") {
      const userNotification = await Notification.create({
        senderId: user._id,
        receiverId: user._id,
        userType: "user",
        type: "business_create_confirmation",
        title: "Business Submitted",
        message: `Your business '${
          businessInfo?.name || "Unnamed"
        }' was created successfully and is waiting for approval.`,
        metadata: {
          businessId: newBusiness._id,
        },
      });

      io.to(`user_${user._id}`).emit("new_notification", userNotification);
    }

    return res.status(201).json({
      success: true,
      message: "Business created successfully",
      data: populatedBusiness,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAllBusinesses = async (req, res) => {
  try {
    const {
      instrumentFamily,
      selectInstrument,
      serviceName,
      offer, // corresponds to category in services
      priceMin,
      priceMax,
      priceSort, // "lowToHigh", "highToLow"
      openNow, // "true"
      sortByCreatedAt, // "asc" | "desc"
      page = 1,
      limit = 10,
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, parseInt(limit));

    const query = {};

    // Services filter
    const serviceFilters = {};

    if (instrumentFamily) serviceFilters.instrumentFamily = instrumentFamily;
    if (selectInstrument) serviceFilters.instrumentType = selectInstrument;
    if (serviceName) serviceFilters.name = serviceName;
    if (offer) serviceFilters.category = offer;

    if (priceMin || priceMax) {
      serviceFilters.$or = [
        {
          pricingType: "exact",
          price: {},
        },
        {
          pricingType: "range",
          price: {},
        },
      ];

      if (priceMin) {
        serviceFilters.$or[0].price.$gte = Number(priceMin);
        serviceFilters.$or[1].price.min = { $gte: Number(priceMin) };
      }
      if (priceMax) {
        serviceFilters.$or[0].price.$lte = Number(priceMax);
        serviceFilters.$or[1].price.max = { $lte: Number(priceMax) };
      }
    }

    if (Object.keys(serviceFilters).length > 0) {
      query.services = { $elemMatch: serviceFilters };
    }

    // Open now filter
    if (openNow === "true") {
      const now = new Date();
      const daysOfWeek = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const currentDay = daysOfWeek[now.getDay()];
      const currentTime = now.toTimeString().slice(0, 5);

      query.businessHours = {
        $elemMatch: {
          day: currentDay,
          closed: false,
          open: { $lte: currentTime },
          close: { $gte: currentTime },
        },
      };
    }

    // Sort options
    const sortObj = {};
    if (sortByCreatedAt) {
      sortObj.createdAt = sortByCreatedAt.toLowerCase() === "asc" ? 1 : -1;
    }

    // Get total count (before skip/limit)
    const totalCount = await Business.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);

    // Query businesses with pagination & sort
    let businesses = await Business.find(query)
      .sort(sortObj)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize);

    // Re-filter on price (nested & complex case) after DB query if needed
    if (priceMin || priceMax) {
      businesses = businesses.filter((business) =>
        business.services.some((service) => {
          if (service.pricingType === "exact") {
            if (priceMin && service.price < Number(priceMin)) return false;
            if (priceMax && service.price > Number(priceMax)) return false;
            return true;
          } else if (service.pricingType === "range") {
            if (priceMin && service.price.min < Number(priceMin)) return false;
            if (priceMax && service.price.max > Number(priceMax)) return false;
            return true;
          }
          return false;
        })
      );
    }

    // Sort by price lowToHigh / highToLow
    if (priceSort === "lowToHigh") {
      businesses.sort((a, b) => {
        const aMin = Math.min(
          ...a.services.map((s) =>
            s.pricingType === "exact"
              ? s.price
              : s.price.min ?? Number.MAX_SAFE_INTEGER
          )
        );
        const bMin = Math.min(
          ...b.services.map((s) =>
            s.pricingType === "exact"
              ? s.price
              : s.price.min ?? Number.MAX_SAFE_INTEGER
          )
        );
        return aMin - bMin;
      });
    } else if (priceSort === "highToLow") {
      businesses.sort((a, b) => {
        const aMax = Math.max(
          ...a.services.map((s) =>
            s.pricingType === "exact" ? s.price : s.price.max ?? 0
          )
        );
        const bMax = Math.max(
          ...b.services.map((s) =>
            s.pricingType === "exact" ? s.price : s.price.max ?? 0
          )
        );
        return bMax - aMax;
      });
    }

    return res.status(200).json({
      success: true,
      message: "Businesses fetched successfully",
      data: businesses,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        totalPages,
        totalCount,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getBusinessById = async (req, res) => {
  try {
    const { businessId } = req.params;

    const business = await Business.findById(businessId)
      .populate("services")
      .populate("musicLessons")
      .populate("user", "name email")
      .populate("adminId", "name email")
      .populate("review");

    if (!business) {
      throw new Error("Business not found");
    }

    return res.status(200).json({
      success: true,
      message: "Business fetched successfully",
      data: business,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getBusinessesByUser = async (req, res) => {
  try {
    const { userId } = req.user;

    const isExist = await User.findById({ _id: userId });
    if (!isExist) {
      return res.status(404).json({
        status: false,
        message: "User not found.",
      });
    }

    const businesses = await Business.find({ userId });

    return res.status(200).json({
      success: true,
      message: "Your businesses fetched successfully",
      data: businesses,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getMyApprovedBusinesses = async (req, res) => {
  try {
    const { email } = req.user;
    console.log("Fetching approved businesses for user:", email);
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    const businesses = await Business.find({
      user: user._id,
      status: "approved",
    });
    if (!businesses) {
      return res.status(404).json({
        success: false,
        message: "No businesses found for this user",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Your businesses fetched successfully",
      data: businesses,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.getDashboardData = async (req, res) => {
  try {
    const { range = "day" } = req.query;

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (range === "week") {
      start.setDate(start.getDate() - 7);
    } else if (range === "month") {
      start.setDate(1);
    }

    // Helper to count total and new
    const countData = async (Model, extraFilter = {}) => {
      const total = await Model.countDocuments(extraFilter);
      const newCount = await Model.countDocuments({
        ...extraFilter,
        createdAt: { $gte: start },
      });
      return { total, new: newCount };
    };

    const businesses = await countData(Business);
    const reviews = await countData(ReviewModel);
    const photos = await countData(PictureModel);
    const claims = await countData(ClaimBussiness);
    const users = await countData(User);

    const businessSubmissions = await countData(Business, {
      status: "pending",
    });
    const reviewSubmissions = await countData(ReviewModel, {
      status: "pending",
    });
    const photoSubmissions = await countData(PictureModel, {
      status: "pending",
    });
    const claimRequests = await countData(ClaimBussiness, {
      status: "pending",
    });
    const profilesUnderReview = await countData(User, {
      status: "pending",
    });

    const dashboardData = {
      businesses,
      reviews,
      photos,
      claims,
      users,
      businessSubmissions,
      reviewSubmissions,
      photoSubmissions,
      claimRequests,
      profilesUnderReview,
    };

    return res.status(200).json({
      success: true,
      message: "Dashboard data get successfully",
      data: dashboardData,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};




