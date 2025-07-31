const { sendImageToCloudinary } = require("../../utils/cloudnary");
const User = require("../user/user.model");
const fs = require("fs");
const Business = require("./business.model");
const ReviewModel = require("../review/review.model");
const PictureModel = require("../picture/picture.model");
const ClaimBussiness = require("../claimBussiness/claimBussiness.model");
const getTimeRange = require("../../utils/getTimeRange");
const SavedBusinessModel = require("../savedBusiness/SavedBusiness.model");
const Notification = require("../notification/notification.model");

exports.createBusiness = async (req, res) => {
  try {
    const { email, userType } = req.user;
    const {
      services,
      businessInfo,
      businessHours,
      longitude,
      latitude,
      musicLessons,
      ...rest
    } = req.body;

    const files = req.files;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const ownerField = userType === "admin" ? "adminId" : "user";

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

    const business = await Business.create({
      ...rest,
      [ownerField]: user._id,
      businessInfo: { ...businessInfo, image },
      services,
      musicLessons,
      businessHours,
      longitude,
      latitude,
    });

    // After business creation
    const adminUsers = await User.find({ userType: "admin" });
    const io = req.app.get("io");

    // Notify Admins
    for (const admin of adminUsers) {
      const notify = await Notification.create({
        senderId: user._id,
        receiverId: admin._id,
        userType: "admin",
        type: "new_business_submitted",
        title: "New Business Submitted",
        message: `${user.name || "A user"} submitted a new business.`,
        metadata: { businessId: business._id },
      });
      io.to(`${admin._id}`).emit("new_notification", notify);
    }

    // Notify Business Owner (User)
    const notifyUser = await Notification.create({
      senderId: user._id,
      receiverId: user._id,
      userType: userType,
      type: "business_submission",
      title: "Business Created",
      message: `You have successfully created a business.`,
      metadata: { businessId: business._id },
    });
    io.to(`${user._id}`).emit("new_notification", notifyUser);

    return res.status(201).json({
      success: true,
      message: "Business created successfully",
      business,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAllBusinesses = async (req, res) => {
  try {
    const {
      search,
      instrumentFamily,
      selectedInstrumentsGroup,
      newInstrumentName,
      minPrice,
      maxPrice,
      buyInstruments,
      sellInstruments,
      offerMusicLessons,
      sort,
      openNow,
      postalCode,
      page = 1, // Default to page 1
      limit = 40, // Default to 10 items per page
    } = req.query;

    // Convert page and limit to numbers
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Base query
    let query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { "businessInfo.name": { $regex: search, $options: "i" } },
        { "services.newInstrumentName": { $regex: search, $options: "i" } },
        { "musicLessons.newInstrumentName": { $regex: search, $options: "i" } },
        {
          "services.selectedInstrumentsGroup": {
            $regex: search,
            $options: "i",
          },
        },
        {
          "musicLessons.selectedInstrumentsGroupMusic": {
            $regex: search,
            $options: "i",
          },
        },
        { "businessInfo.address": { $regex: search, $options: "i" } },
      ];
    }

    // Filter by postal code
    if (postalCode) {
      query["businessInfo.address"] = { $regex: postalCode, $options: "i" };
    }

    // Filter by instrument family
    if (instrumentFamily) {
      query["services.instrumentFamily"] = instrumentFamily;
    }

    // Filter by selected instruments group
    if (selectedInstrumentsGroup) {
      query.$or = [
        { "services.selectedInstrumentsGroup": selectedInstrumentsGroup },
        {
          "musicLessons.selectedInstrumentsGroupMusic":
            selectedInstrumentsGroup,
        },
      ];
    }

    // Filter by new instrument name
    if (newInstrumentName) {
      query.$or = [
        { "services.newInstrumentName": newInstrumentName },
        { "musicLessons.newInstrumentName": newInstrumentName },
      ];
    }

    // Price range filter
    if (minPrice || maxPrice) {
      const priceQuery = {
        $or: [
          // For exact pricing
          {
            $or: [
              {
                "services.price": {
                  $gte: minPrice || 0,
                  $lte: maxPrice || Number.MAX_SAFE_INTEGER,
                },
              },
              {
                "musicLessons.price": {
                  $gte: minPrice || 0,
                  $lte: maxPrice || Number.MAX_SAFE_INTEGER,
                },
              },
            ],
          },
          // For range pricing
          {
            $or: [
              {
                $and: [
                  { "services.minPrice": { $gte: minPrice || 0 } },
                  {
                    "services.maxPrice": {
                      $lte: maxPrice || Number.MAX_SAFE_INTEGER,
                    },
                  },
                ],
              },
              {
                $and: [
                  { "musicLessons.minPrice": { $gte: minPrice || 0 } },
                  {
                    "musicLessons.maxPrice": {
                      $lte: maxPrice || Number.MAX_SAFE_INTEGER,
                    },
                  },
                ],
              },
            ],
          },
        ],
      };
      query.$and = query.$and ? [...query.$and, priceQuery] : [priceQuery];
    }

    // Filter by offers
    if (buyInstruments === "true") query.buyInstruments = true;
    if (sellInstruments === "true") query.sellInstruments = true;
    if (offerMusicLessons === "true") query.offerMusicLessons = true;

    // First get total count for pagination info
    const totalCount = await Business.countDocuments(query);

    // Find businesses with the query and pagination
    let businessesQuery = Business.find(query)
      .populate("user", "name email")
      .skip(skip)
      .limit(limitNumber);

    // Open now filter (after initial query since it requires date/time calculation)
    if (openNow === "true") {
      const now = new Date();
      const currentDay = now
        .toLocaleString("en-us", { weekday: "long" })
        .toLowerCase();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();

      // We need to apply this filter after the initial query due to time calculations
      let businesses = await businessesQuery;

      businesses = businesses.filter((business) => {
        const todayHours = business.businessHours.find(
          (h) => h.day.toLowerCase() === currentDay
        );
        if (!todayHours || !todayHours.enabled) return false;

        // Convert business hours to 24-hour format for comparison
        const openHour =
          todayHours.startMeridiem === "PM" && todayHours.startTime !== "12:00"
            ? parseInt(todayHours.startTime.split(":")[0]) + 12
            : parseInt(todayHours.startTime.split(":")[0]);
        const openMinute = parseInt(todayHours.startTime.split(":")[1]);

        const closeHour =
          todayHours.endMeridiem === "PM" && todayHours.endTime !== "12:00"
            ? parseInt(todayHours.endTime.split(":")[0]) + 12
            : parseInt(todayHours.endTime.split(":")[0]);
        const closeMinute = parseInt(todayHours.endTime.split(":")[1]);

        return (
          (currentHours > openHour ||
            (currentHours === openHour && currentMinutes >= openMinute)) &&
          (currentHours < closeHour ||
            (currentHours === closeHour && currentMinutes <= closeMinute))
        );
      });

      // Reapply pagination after openNow filter
      const startIndex = skip;
      const endIndex = skip + limitNumber;
      const paginatedBusinesses = businesses.slice(startIndex, endIndex);

      // Sorting after openNow filter
      if (sort) {
        paginatedBusinesses.sort((a, b) => {
          const getMinPrice = (business) => {
            const servicePrices = business.services.map((s) =>
              s.pricingType === "range"
                ? parseInt(s.minPrice || 0)
                : parseInt(s.price || 0)
            );
            const lessonPrices = business.musicLessons.map((l) =>
              l.pricingType === "range"
                ? parseInt(l.minPrice || 0)
                : parseInt(l.price || 0)
            );
            const allPrices = [...servicePrices, ...lessonPrices].filter(
              (p) => !isNaN(p)
            );
            return allPrices.length > 0 ? Math.min(...allPrices) : 0;
          };

          const aPrice = getMinPrice(a);
          const bPrice = getMinPrice(b);

          if (sort === "high-to-low") return bPrice - aPrice;
          if (sort === "low-to-high") return aPrice - bPrice;
          return 0;
        });
      }

      return res.status(200).json({
        success: true,
        message: "Businesses fetched successfully",
        data: paginatedBusinesses,
        pagination: {
          total: businesses.length, // Total after openNow filter
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(businesses.length / limitNumber),
        },
      });
    }

    // Sorting for non-openNow queries
    if (sort) {
      businessesQuery = businessesQuery.lean(); // Convert to plain JS object for sorting

      const businesses = await businessesQuery;

      businesses.sort((a, b) => {
        const getMinPrice = (business) => {
          const servicePrices = business.services.map((s) =>
            s.pricingType === "range"
              ? parseInt(s.minPrice || 0)
              : parseInt(s.price || 0)
          );
          const lessonPrices = business.musicLessons.map((l) =>
            l.pricingType === "range"
              ? parseInt(l.minPrice || 0)
              : parseInt(l.price || 0)
          );
          const allPrices = [...servicePrices, ...lessonPrices].filter(
            (p) => !isNaN(p)
          );
          return allPrices.length > 0 ? Math.min(...allPrices) : 0;
        };

        const aPrice = getMinPrice(a);
        const bPrice = getMinPrice(b);

        if (sort === "high-to-low") return bPrice - aPrice;
        if (sort === "low-to-high") return aPrice - bPrice;
        return 0;
      });

      return res.status(200).json({
        success: true,
        message: "Businesses fetched successfully",
        data: businesses,
        pagination: {
          total: totalCount,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(totalCount / limitNumber),
        },
      });
    }

    // Regular query without openNow or sorting
    const businesses = await businessesQuery;

    return res.status(200).json({
      success: true,
      message: "Businesses fetched successfully",
      data: businesses,
      pagination: {
        total: totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
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

exports.getBusinessmanDashboardData = async (req, res) => {
  try {
    const { range = "day" } = req.query;
    const { userId } = req.user;

    if (req.user.userType !== "businessMan") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Step 1: Find all businesses owned by the user
    const businesses = await Business.find({ user: userId }).select(
      "_id businessInfo.name"
    );
    const savedBusiness = await SavedBusinessModel.find({
      user: userId,
    }).select("_id savedBusiness businessInfo.name");
    const businessIds = businesses.map((b) => b._id);
    const savedBusinessIds = savedBusiness.map((b) => b.savedBusiness);
    console.log(savedBusinessIds);

    const startDate = getTimeRange(range);

    const queryWithDate = { $gte: startDate };
    const [totalReviews, totalPhotos, totalSaves, recentReviews] =
      await Promise.all([
        // Only reviews of my businesses
        ReviewModel.countDocuments({
          business: { $in: businessIds },
          createdAt: queryWithDate,
        }),

        ReviewModel.countDocuments({
          business: { $in: businessIds },
          createdAt: queryWithDate,
          reviewImage: { $exists: true, $ne: [] },
        }),
        // Only photos for my businesses
        // PictureModel.countDocuments({
        //   business: { $in: businessIds },
        //   createdAt: queryWithDate,
        // }),

        SavedBusinessModel.countDocuments({
          savedBusiness: { $in: savedBusinessIds },
          user: userId,
          createdAt: queryWithDate,
        }),
        // Fetch latest reviews for my businesses
        ReviewModel.find({
          business: { $in: businessIds },
          createdAt: queryWithDate,
        })
          .populate("user", "name profilePhoto")
          .populate("business", "businessInfo.name")
          .sort({ createdAt: -1 })
          .limit(5),
      ]);

    return res.status(200).json({
      success: true,
      message: `Dashboard data (${range}) for businessman`,
      data: {
        reviews: totalReviews,
        photos: totalPhotos,
        saves: totalSaves,
        latestReviews: recentReviews.map((r) => ({
          id: r._id,
          rating: r.rating,
          comment: r.comment,
          date: r.createdAt,
          user: {
            name: r.user?.name,
            profilePhoto: r.user?.profilePhoto || null,
          },
          business: {
            id: r.business?._id,
            name: r.business?.businessInfo?.name || "N/A",
          },
        })),
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllBusinessesByAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      businessType,
      time = "all",
      sortBy = "latest",
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, parseInt(limit));

    const filter = {};
    const sortOption = {};

    if (
      businessType &&
      ["pending", "approved", "rejected"].includes(businessType.toLowerCase())
    ) {
      filter.status = businessType.toLowerCase();
    }

    if (time && ["last-7", "last-30"].includes(time)) {
      const now = new Date();
      let fromDate = new Date();

      if (time === "last-7") {
        fromDate.setDate(now.getDate() - 7);
      } else if (time === "last-30") {
        fromDate.setDate(now.getDate() - 30);
      }

      filter.createdAt = { $gte: fromDate };
    }

    let businessesQuery = Business.find(filter)
      .select("businessInfo user status createdAt")
      .populate("user", "name email");

    if (["latest", "oldest"].includes(sortBy)) {
      sortOption.createdAt = sortBy === "latest" ? -1 : 1;
    } else if (sortBy === "A-Z") {
      sortOption["businessInfo.name"] = 1;
      businessesQuery = businessesQuery.collation({
        locale: "en",
        strength: 2,
      });
    } else if (sortBy === "Z-A") {
      sortOption["businessInfo.name"] = -1;
      businessesQuery = businessesQuery.collation({
        locale: "en",
        strength: 2,
      });
    }

    const totalCount = await Business.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / pageSize);

    if (sortBy === "status") {
      const allBusinesses = await businessesQuery;

      const statusOrder = { pending: 1, approved: 2, rejected: 3 };

      const sortedBusinesses = allBusinesses.sort((a, b) => {
        const statusCompare = statusOrder[a.status] - statusOrder[b.status];
        if (statusCompare !== 0) return statusCompare;

        return a.businessInfo.name.localeCompare(b.businessInfo.name, "en", {
          sensitivity: "base",
        });
      });

      const paginated = sortedBusinesses.slice(
        (pageNumber - 1) * pageSize,
        pageNumber * pageSize
      );

      return res.status(200).json({
        success: true,
        message: "Businesses fetched successfully",
        data: paginated,
        pagination: {
          page: pageNumber,
          limit: pageSize,
          totalPages,
          totalCount,
        },
      });
    }

    const businesses = await businessesQuery
      .sort(sortOption)
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize);

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
    return res.status(500).json({
      success: false,
      message: error.message,
      error,
    });
  }
};

exports.toggleBusinessStatus = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { businessId } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'approved' or 'rejected'.",
      });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found.",
      });
    }

    business.status = status;
    await business.save();

    // Get the business owner
    const ownerId = business.user || business.adminId;
    const userType = business.user ? "user" : "admin"; // just in case

    // Send notification to business owner only if status is approved
    if (status === "approved" && ownerId) {
      const owner = await User.findById(ownerId);
      if (owner) {
        const notify = await Notification.create({
          senderId: null, // admin system
          receiverId: owner._id,
          userType,
          type: "business_approved",
          title: "Business Approved",
          message: `Your business "${business.businessInfo?.name || "Business"
            }" has been approved.`,
          metadata: {
            businessId: business._id,
          },
        });

        io.to(`${owner._id}`).emit("new_notification", notify);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Business status updated to ${status}`,
      data: business,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const files = req.files;
    const { user, userType } = req.user;

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found.",
      });
    }

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

    // Prepare update payload
    const updatePayload = { ...req.body };

    // Append new images to existing ones instead of replacing
    if (image.length > 0) {
      if (!updatePayload.businessInfo) {
        updatePayload.businessInfo = {};
      }

      const existingImages = business.businessInfo?.image || [];
      updatePayload.businessInfo.image = [...existingImages, ...image];
    }

    const updatedBusiness = await Business.findByIdAndUpdate(
      businessId,
      { $set: updatePayload },
      { new: true }
    );

    const adminUsers = await User.find({ userType: "admin" });
    const io = req.app.get("io");

    // Notify Admins
    for (const admin of adminUsers) {
      const notify = await Notification.create({
        senderId: user._id,
        receiverId: admin._id,
        userType: "admin",
        type: "new_business_updated",
        title: "Business Updated",
        message: `${user.name || "A user"} updated a business.`,
        metadata: { businessId: business._id },
      });
      io.to(`${admin._id}`).emit("new_notification", notify);
    }

    // Notify Business Owner
    const notifyUser = await Notification.create({
      senderId: user._id,
      receiverId: user._id,
      userType: userType,
      type: "business_update",
      title: "Business Updated",
      message: `You have successfully updated your business.`,
      metadata: { businessId: business._id },
    });
    io.to(`${user._id}`).emit("new_notification", notifyUser);

    return res.status(200).json({
      success: true,
      message: "Business updated successfully",
      data: updatedBusiness,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      error,
    });
  }
};

exports.removedImage = async (req, res) => {
  try {
    const { businessId, imageIndex } = req.params;
    const index = parseInt(imageIndex, 10);

    if (isNaN(index)) {
      return res.status(400).json({
        success: false,
        message: "Invalid image index",
      });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found.",
      });
    }

    if (
      !business.businessInfo.image ||
      business.businessInfo.image.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "No images to remove",
      });
    }

    if (index < 0 || index >= business.businessInfo.image.length) {
      return res.status(400).json({
        success: false,
        message: "Image index out of range",
      });
    }

    const updatedImages = [...business.businessInfo.image];
    updatedImages.splice(index, 1);

    const updatedBusiness = await Business.findByIdAndUpdate(
      businessId,
      { $set: { "businessInfo.image": updatedImages } },
      { new: true, runValidators: false }
    );


    
    return res.status(200).json({
      success: true,
      message: "Image removed successfully",
      data: updatedBusiness,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      error,
    });
  }
};

exports.getEveryInstrumentService = async (req, res) => {
  try {
    const allBusinesses = await Business.find({}, "services");

    const groupedServices = {};

    allBusinesses.forEach((business) => {
      if (Array.isArray(business.services)) {
        business.services.forEach((service) => {
          const family = service.instrumentFamily?.toLowerCase() || "unknown";
          const group =
            service.selectedInstrumentsGroup?.toLowerCase() || "unknown";

          if (!groupedServices[family]) {
            groupedServices[family] = {};
          }

          if (!groupedServices[family][group]) {
            groupedServices[family][group] = [];
          }

          // Only push selected fields
          groupedServices[family][group].push({
            newInstrumentName: service.newInstrumentName,
            pricingType: service.pricingType,
            selectedInstrumentsGroup: service.selectedInstrumentsGroup,
            instrumentFamily: service.instrumentFamily,
          });
        });
      }
    });

    return res.status(200).json({
      success: true,
      data: groupedServices,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
