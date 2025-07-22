const { sendImageToCloudinary } = require("../../utils/cloudnary");
const { LessonService } = require("../lessonService/lessonService.model");
const User = require("../user/user.model");
const fs = require("fs");
const {
  createNotification,
  createNotificationAdmin,
} = require("../../utils/createNotification");
const sendNotiFication = require("../../utils/sendNotification");
const Business = require("./business.model");
const ReviewModel = require("../review/review.model");
const PictureModel = require("../picture/picture.model");
const ClaimBussiness = require("../claimBussiness/claimBussiness.model");


exports.createBusiness = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { email, userType } = req.user;
    const { services: servicesIds, businessInfo, ...otherFields } = req.body;
    const files = req.files;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const ownerField = userType === "admin" ? "adminId" : "user";

    // Verify all serviceOffered IDs exist
    const services = await ServiceOffered.find({ _id: { $in: servicesIds } });
    if (services.length !== servicesIds.length) {
      return res
        .status(404)
        .json({ success: false, error: "Some services not found" });
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

    // Merge images into businessInfo
    const newBusinessInfo = {
      ...businessInfo,
      ...(image.length > 0 ? { image } : {}),
    };

    // Create business document with all other fields and services array
    const newBusiness = await Business.create({
      ...otherFields,
      [ownerField]: user._id,
      services: servicesIds,
      businessInfo: newBusinessInfo,
    });

    // Push business ref to user.businesses array (optional)
    await User.findByIdAndUpdate(user._id, {
      $push: { businesses: newBusiness._id },
    });

    const business = await Business.findById(result._id);
    const userAdmin = await User.find({ userType: "admin" });

    for (const admin of userAdmin) {
      const notify = await Notification.create({
        senderId: user._id,
        receiverId: admin._id,
        userType: "admin",
        type: "business_created",
        title: "New Business Submission",
        message: `${user.name} has submitted a new business for approval .`,
        metadata: { businessId: result._id },
      });

      // Emit to admin socket room
      io.to(`admin_${admin._id}`).emit("new_notification", notify);
    }

    return res.status(201).json({
      success: true,
      message: "Business created successfully",
      data: populatedBusiness,
    });
  } catch (error) {
    console.error("Create business error:", error);
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

// exports.getAllBusinessesAdmin = async (req, res) => {
//   try {
//     const { userId: userID } = req.user;
//     console.log(req.user);
//     const isAdmin = await User.findById(userID);
//     if (isAdmin.userType !== "admin") {
//       return res.status(403).json({
//         status: false,
//         message: "Access denied. Admins only.",
//       });
//     }
//     const { search = "" } = req.query;

//     const page = parseInt(req.query.page) || 1; // default page = 1
//     const limit = parseInt(req.query.limit) || 10; // default limit = 10
//     const skip = (page - 1) * limit;

//     const total = await Business.countDocuments();

//     const filter = {
//       "businessInfo.name": { $regex: search, $options: "i" },
//     };

//     const businesses = await Business.find(filter)
//       .skip(skip)
//       .limit(limit)
//       .populate("instrumentInfo")
//       .populate("lessonServicePrice")
//       .populate({
//         path: "review",
//         populate: {
//           path: "user",
//           select: "name email",
//         },
//       })
//       .populate("user", "name email role");

//     if (businesses.length === 0) {
//       return res.status(201).json({
//         success: true,
//         message: "No businesses found",
//       });
//     }
//     const totalPages = Math.ceil(total / limit);

//     return res.status(200).json({
//       success: true,
//       message: "Businesses fetched successfully",
//       currentPage: page,
//       totalPages,
//       totalItems: total,
//       data: businesses,
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

exports.getBusinessById = async (req, res) => {
  try {
    const { businessId } = req.params;
    const business = await Business.findById(businessId);
    if (!business) {
      return res
        .status(404)
        .json({ success: false, message: "Business not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Business fetched successfully",
      data: business,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//get user
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

// exports.updateBusiness = async (req, res) => {
//   try {
//     const io = req.app.get("io");
//     const { email: userEmail, userId } = req.user;
//     const user = await User.findOne({ email: userEmail });

//     if (!user) {
//       return res.status(400).json({ status: false, message: "User not found" });
//     }



//     // ✅ Save new lessonServicePrice if provided
//     let savedLessonServiceId = null;
//     if (data.lessonServicePrice) {
//       const lessonService = new LessonService(data.lessonServicePrice);
//       const savedLessonService = await lessonService.save();
//       savedLessonServiceId = savedLessonService._id;
//     }



//     const savedBusiness = await new Business(updatedBusiness).save();
//     const message1 = `${user.name} has updated a business: ${savedBusiness.businessInfo.name}`;
//     const message2 = `You have updated a business: ${savedBusiness.businessInfo.name}`;
//     const saveNotification = await createNotification(
//       userId,
//       message2,
//       "Business Update"
//     );
//     const saveNotificationAdmin = await createNotificationAdmin(
//       userId,
//       message1,
//       "Business Update"
//     );

//     await sendNotiFication(io, req, saveNotification, saveNotificationAdmin);

