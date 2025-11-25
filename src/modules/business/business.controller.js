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
const { GOOGLE_API_KEY } = require("../../config");
const axios = require("axios");

exports.createBusiness = async (req, res) => {
  try {
    // const { email, userType } = req.user;
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
    // const user = await User.findOne({ email });
    // if (!user)
    //   return res.status(404).json({ success: false, error: "User not found" });

    // const ownerField = userType === "admin" ? "adminId" : "user";

    // ---------- Upload images ----------
    let image = [];
    if (files && Array.isArray(files) && files.length === 0) {
      // Handle no files uploaded
      return res
        .status(400)
        .json({ success: false, message: "No files uploaded" });
    } else {
      image = await Promise.all(
        files.map(async (file) => {
          const imageName = `business/${Date.now()}_${file.originalname}`;
          const result = await sendImageToCloudinary(imageName, file.path);
          fs.unlinkSync(file.path);
          return result.secure_url;
        })
      );
    }

    // ---------- Create Business ----------
    const business = await Business.create({
      ...rest,
      // [ownerField]: user._id,
      businessInfo: { ...businessInfo, image },
      services,
      musicLessons,
      businessHours,
      longitude,
      latitude,
    });

    // ---------- Google Place API ----------
    let placeReviews = [];
    let placeId = null;

    try {
      // 1️⃣ Get placeId dynamically using Geocoding API
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        businessInfo.address
      )}&key=${GOOGLE_API_KEY}`;

      const geoResponse = await axios.get(geoUrl);
      if (
        geoResponse.data.status === "OK" &&
        geoResponse.data.results.length > 0
      ) {
        placeId = geoResponse.data.results[0].place_id;

        // 2️⃣ Fetch reviews using Place Details API
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews&key=${GOOGLE_API_KEY}`;

        const detailsResponse = await axios.get(detailsUrl);
        const placeDetails = detailsResponse.data.result;
        if (placeDetails?.reviews?.length > 0) {
          placeReviews = placeDetails.reviews.slice(0, 5).map((r) => ({
            rating: r.rating,
            feedback: r.text || "No feedback",
            user: null,
            business: business._id,
            googlePlaceId: placeId,
            status: "approved",
          }));
        }
      }
    } catch (err) {
      console.warn("Google Place fetch failed:", err.message);
    }

    // ---------- Save Google reviews ----------
    if (placeReviews.length > 0) {
      const savedReviews = await ReviewModel.insertMany(placeReviews);
      business.review = savedReviews.map((r) => r._id);
      await business.save();
    }

    // ---------- Notifications ----------
    const adminUsers = await User.find({ userType: "admin" });
    const io = req.app.get("io");

    for (const admin of adminUsers) {
      const notify = await Notification.create({
        // senderId: user._id,
        receiverId: admin._id,
        userType: "admin",
        type: "new_business_submitted",
        title: "New Business Submitted",
        message: `A new business has been submitted for approval.`,
        metadata: { businessId: business._id },
      });
      io.to(`${admin._id}`).emit("new_notification", notify);
    }

    return res.status(201).json({
      success: true,
      message: "Business created successfully",
      business,
      googleReviews: placeReviews,
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
      page = 1,
      limit = 40,
    } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    let query = { status: "approved" };

    // SEARCH FILTER
    if (search) {
      const searchTerms = Array.isArray(search) ? search : [search];
      const regexArray = searchTerms.map(
        (t) =>
          new RegExp(t.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      );

      const searchFields = [
        "businessInfo.name",
        "services.newInstrumentName",
        "musicLessons.newInstrumentName",
        "services.selectedInstrumentsGroup",
        "musicLessons.selectedInstrumentsGroupMusic",
        "businessInfo.address",
        "services.instrumentFamily",
      ];

      if (searchTerms.length > 1) {
        query.$and = regexArray.map((regex) => ({
          $or: searchFields.map((field) => ({ [field]: regex })),
        }));
      } else {
        query.$or = searchFields.map((field) => ({
          [field]: regexArray[0],
        }));
      }
    }

    // POSTAL CODE FILTER
    if (postalCode) {
      const arr = Array.isArray(postalCode) ? postalCode : [postalCode];
      const regexArr = arr.map(
        (t) =>
          new RegExp(t.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      );

      query["businessInfo.address"] =
        regexArr.length > 1 ? { $in: regexArr } : regexArr[0];
    }

    // INSTRUMENT FAMILY FILTER
    if (instrumentFamily) {
      const arr = Array.isArray(instrumentFamily)
        ? instrumentFamily
        : [instrumentFamily];
      const regexArr = arr.map(
        (t) =>
          new RegExp(t.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      );

      query["services.instrumentFamily"] =
        regexArr.length > 1 ? { $in: regexArr } : regexArr[0];
    }

    // SELECTED INSTRUMENT GROUP FILTER

    if (selectedInstrumentsGroup) {
      const arr = Array.isArray(selectedInstrumentsGroup)
        ? selectedInstrumentsGroup
        : [selectedInstrumentsGroup];

      const regexArr = arr.map(
        (t) =>
          new RegExp(t.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      );

      const groupConditions = regexArr.flatMap((regex) => [
        { "services.selectedInstrumentsGroup": regex },
        { "musicLessons.selectedInstrumentsGroupMusic": regex },
      ]);

      if (arr.length > 1) {
        if (!query.$and) query.$and = [];
        query.$and.push({ $or: groupConditions });
      } else {
        query.$or = query.$or
          ? [...query.$or, ...groupConditions]
          : groupConditions;
      }
    }


    // NEW INSTRUMENT NAME FILTER

    if (newInstrumentName) {
      const arr = Array.isArray(newInstrumentName)
        ? newInstrumentName
        : [newInstrumentName];

      const regexArr = arr.map(
        (t) =>
          new RegExp(t.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      );

      const nameConditions = regexArr.flatMap((regex) => [
        { "services.newInstrumentName": regex },
        { "musicLessons.newInstrumentName": regex },
        { "services.instrumentFamily": regex },
      ]);

      if (arr.length > 1) {
        if (!query.$and) query.$and = [];
        query.$and.push({ $or: nameConditions });
      } else {
        query.$or = query.$or
          ? [...query.$or, ...nameConditions]
          : nameConditions;
      }
    }

    // PRICE FILTER

    if (minPrice || maxPrice) {
      const min = minPrice ? parseFloat(minPrice) : 0;
      const max = maxPrice ? parseFloat(maxPrice) : Number.MAX_SAFE_INTEGER;

      const priceQuery = {
        $or: [
          { "services.price": { $gte: min, $lte: max } },
          { "musicLessons.price": { $gte: min, $lte: max } },
          {
            $and: [
              { "services.minPrice": { $gte: min } },
              { "services.maxPrice": { $lte: max } },
            ],
          },
          {
            $and: [
              { "musicLessons.minPrice": { $gte: min } },
              { "musicLessons.maxPrice": { $lte: max } },
            ],
          },
        ],
      };

      query.$and = query.$and ? [...query.$and, priceQuery] : [priceQuery];
    }


    // SPECIAL FLAGS

    if (buyInstruments === "true") query.buyInstruments = true;
    if (sellInstruments === "true") query.sellInstruments = true;
    if (offerMusicLessons === "true") query.offerMusicLessons = true;

    // TOTAL COUNT
    const totalCount = await Business.countDocuments(query);

    // ALWAYS use lean()
    let businesses = await Business.find(query)
      .skip(skip)
      .limit(limitNumber)
      .lean();
    // OPEN NOW FILTER

    if (openNow === "true") {
      const now = new Date();
      const day = now
        .toLocaleString("en-us", { weekday: "long" })
        .toLowerCase();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      businesses = businesses.filter((b) => {
        const today = b.businessHours.find(
          (h) => h.day.toLowerCase() === day && h.enabled
        );
        if (!today) return false;

        let start =
          parseInt(today.startTime.split(":")[0]) * 60 +
          parseInt(today.startTime.split(":")[1]);
        let end =
          parseInt(today.endTime.split(":")[0]) * 60 +
          parseInt(today.endTime.split(":")[1]);

        return currentMinutes >= start && currentMinutes <= end;
      });
    }

    // SORTING
    if (sort) {
      const getMinPrice = (b) => {
        const s = b.services.map((x) =>
          x.pricingType === "range" && x.minPrice
            ? parseFloat(x.minPrice)
            : x.price
            ? parseFloat(x.price)
            : Infinity
        );
        const m = b.musicLessons.map((x) =>
          x.pricingType === "range" && x.minPrice
            ? parseFloat(x.minPrice)
            : x.price
            ? parseFloat(x.price)
            : Infinity
        );
        const all = [...s, ...m].filter((n) => !isNaN(n));
        return all.length ? Math.min(...all) : Infinity;
      };

      businesses.sort((a, b) =>
        sort === "high-to-low"
          ? getMinPrice(b) - getMinPrice(a)
          : getMinPrice(a) - getMinPrice(b)
      );
    }
    // PAGINATION
    const paginatedBusinesses = businesses.slice(skip, skip + limitNumber);
    // IMAGE COLLECTOR (per business)
    const businessIds = paginatedBusinesses.map((b) => b._id);

    const [reviews, pictures] = await Promise.all([
      ReviewModel.find({
        business: { $in: businessIds },
        status: "approved",
      }).select("business image"),

      PictureModel.find({
        business: { $in: businessIds },
        status: "approved",
      }).select("business image"),
    ]);

    // Attach images to each business
    for (const b of paginatedBusinesses) {
      const reviewImgs = reviews
        .filter((r) => r.business.toString() === b._id.toString())
        .flatMap((r) => r.image || []);

      const pictureImgs = pictures
        .filter((p) => p.business.toString() === b._id.toString())
        .flatMap((p) => p.image || []);

      const businessImgs = Array.isArray(b.businessInfo?.image)
        ? b.businessInfo.image
        : [];

      b.images = [...reviewImgs, ...pictureImgs, ...businessImgs];
    }

    return res.status(200).json({
      success: true,
      message: "Businesses fetched successfully",
      data: paginatedBusinesses,
      pagination: {
        total: totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
      },
    });
  } catch (error) {
    console.error("Error in getAllBusinesses:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getBusinessById = async (req, res) => {
  try {
    const { businessId } = req.params;

    // 1️⃣ Fetch the business
    const business = await Business.findById(businessId)
      .populate("services")
      .populate("musicLessons")
      .populate({
        path: "review",
        populate: {
          path: "user",
          select: "name email imageLink",
        },
      });

    if (!business) {
      throw new Error("Business not found");
    }

    // 2️⃣ Fetch claim info
    const claim = await ClaimBussiness.findOne({ businessId });

    // 3️⃣ Fetch review images for this business (approved only)
    const reviews = await ReviewModel.find({
      business: businessId,
      status: "approved",
    }).select("image");
    const reviewImages = reviews.flatMap((r) => r.image || []);

    // 4️⃣ Fetch picture images for this business (approved only)
    const pictures = await PictureModel.find({
      business: businessId,
      status: "approved",
    }).select("image");
    const pictureImages = pictures.flatMap((p) => p.image || []);

    // 5️⃣ Combine all images into one array
    const allImages = [
      ...reviewImages,
      ...pictureImages,
      ...business.businessInfo.image,
    ];

    // 6️⃣ Prepare final response object
    const businessWithDetails = {
      ...business.toObject(),
      isClaimed: !!claim,
      claimInfo: claim
        ? {
            userId: claim.userId,
            status: claim.status,
            isVerified: claim.isVerified,
            documents: claim.documents,
          }
        : null,
      images: allImages, // <-- ✅ all combined images here
    };

    // ✅ Send response
    return res.status(200).json({
      success: true,
      message: "Business fetched successfully",
      data: businessWithDetails,
    });
  } catch (error) {
    console.error(error);
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
      throw new Error("User not found");
    }

    const businesses = await Business.find({ user: userId });

    if (!businesses) {
      throw new Error("No businesses found for this user");
    }

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

    console.log("Found businesses:", businesses);
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

    let businessesQuery = Business.find(filter).select(
      "businessInfo user status createdAt"
    );
    // .populate("user", "name email");

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
          message: `Your business "${
            business.businessInfo?.name || "Business"
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
    const { user, userType } = req.user;
    const io = req.app.get("io");

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

    const adminUsers = await User.find({ userType: "admin" });

    for (const admin of adminUsers) {
      const notify = await Notification.create({
        senderId: user._id,
        receiverId: admin._id,
        userType: "admin",
        type: "business_image_removed",
        title: "Image Removed from Business",
        message: `${
          user.name || "A user"
        } removed an image from their business.`,
        metadata: { businessId: business._id },
      });

      io.to(`${admin._id}`).emit("new_notification", notify);
    }

    // Notify Business Owner
    const notifyUser = await Notification.create({
      senderId: user._id,
      receiverId: user._id,
      userType: userType,
      type: "image_removed",
      title: "Business Image Removed",
      message: "You have successfully removed an image from your business.",
      metadata: { businessId: business._id },
    });

    io.to(`${user._id}`).emit("new_notification", notifyUser);

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

exports.toggleBusinessActive = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Invalid input. 'isActive' must be a boolean.",
      });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found.",
      });
    }

    business.isActive = isActive;
    await business.save();

    return res.status(200).json({
      success: true,
      message: `Business ${
        isActive ? "activated" : "deactivated"
      } successfully.`,
      data: business,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
