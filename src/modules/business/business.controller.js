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
    const { type } = req.query;
    let user = null;

    // ---------- Validation ----------
    if (!type || !["myBusiness", "addABusiness"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid business type",
      });
    }

    // ---------- Conditional Authentication ----------
    if (type === "myBusiness") {
      if (!req.user || !req.user.email) {
        return res.status(401).json({
          success: false,
          message: "Please log in to create a business",
        });
      }

      user = await User.findOne({ email: req.user.email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
    }

    const {
      services,
      businessInfo,
      businessHours,
      longitude,
      latitude,
      musicLessons,
      ...rest
    } = req.body;

    // ---------- Files Validation ----------
    const files = req.files;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    // ---------- Upload Images ----------
    const image = await Promise.all(
      files.map(async (file) => {
        const imageName = `business/${Date.now()}_${file.originalname}`;
        const result = await sendImageToCloudinary(imageName, file.path);
        fs.unlinkSync(file.path);
        return result.secure_url;
      })
    );

    // ---------- Create Business ----------
    const business = await Business.create({
      ...rest,
      type,
      // owner: user ? user._id : null, // only for myBusiness
      userId: user ? user._id : null,
      businessInfo: {
        ...businessInfo,
        image,
      },
      services,
      musicLessons,
      businessHours,
      longitude,
      latitude,
      isVerified: type === "addABusiness" ? false : true,
    });

    // ---------- AUTO CLAIM BUSINESS (ONLY myBusiness) ----------
    if (type === "myBusiness" && user) {
      await ClaimBussiness.create({
        businessId: business._id,
        userId: user._id,
        status: "pending",
        isVerified: true,
      });
    }

    // ---------- Google Place Reviews ----------
    let placeReviews = [];
    let placeId = null;

    try {
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        businessInfo.address
      )}&key=${GOOGLE_API_KEY}`;

      const geoResponse = await axios.get(geoUrl);

      if (
        geoResponse.data.status === "OK" &&
        geoResponse.data.results.length > 0
      ) {
        placeId = geoResponse.data.results[0].place_id;

        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,reviews&key=${GOOGLE_API_KEY}`;
        const detailsResponse = await axios.get(detailsUrl);

        if (detailsResponse.data.result?.reviews?.length > 0) {
          placeReviews = detailsResponse.data.result.reviews
            .slice(0, 5)
            .map((r) => ({
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
      console.warn("Google review fetch failed:", err.message);
    }

    // ---------- Save Google Reviews ----------
    if (placeReviews.length > 0) {
      const savedReviews = await ReviewModel.insertMany(placeReviews);
      business.review = savedReviews.map((r) => r._id);
      await business.save();
    }

    // ---------- Notify Admins (Optional) ----------
    const adminUsers = await User.find({ userType: "admin" });
    const io = req.app.get("io");

    for (const admin of adminUsers) {
      const notify = await Notification.create({
        receiverId: admin._id,
        userType: "admin",
        type: "new_business_submitted",
        title: "New Business Submitted",
        message: "A new business has been submitted for approval.",
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
    return res.status(500).json({
      success: false,
      error: error.message,
    });
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

    let query = { status: "approved", $and: [] };

    const toRegexArray = (value) => {
      const arr = Array.isArray(value) ? value : [value];
      return arr.map(
        (v) =>
          new RegExp(v.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      );
    };

    /* ---------------- SEARCH FILTERS ---------------- */

    if (search) {
      const regexArr = toRegexArray(search);
      query.$and.push({
        $or: regexArr.flatMap((regex) => [
          { "businessInfo.name": regex },
          { "businessInfo.address": regex },
          { "services.newInstrumentName": regex },
          { "musicLessons.newInstrumentName": regex },
          { "services.instrumentFamily": regex },
        ]),
      });
    }

    if (postalCode) {
      const regexArr = toRegexArray(postalCode);
      query.$and.push({
        $or: regexArr.map((regex) => ({
          "businessInfo.address": regex,
        })),
      });
    }

    if (instrumentFamily) {
      const regexArr = toRegexArray(instrumentFamily);
      query.$and.push({
        $or: regexArr.map((regex) => ({
          "services.instrumentFamily": regex,
        })),
      });
    }

    if (selectedInstrumentsGroup) {
      const regexArr = toRegexArray(selectedInstrumentsGroup);
      query.$and.push({
        $or: regexArr.flatMap((regex) => [
          { "services.selectedInstrumentsGroup": regex },
          { "musicLessons.selectedInstrumentsGroupMusic": regex },
        ]),
      });
    }

    if (newInstrumentName) {
      const regexArr = toRegexArray(newInstrumentName);
      query.$and.push({
        $or: regexArr.flatMap((regex) => [
          { "services.newInstrumentName": regex },
          { "musicLessons.newInstrumentName": regex },
        ]),
      });
    }

    /* ---------------- FLAGS ---------------- */

    if (buyInstruments === "true") query.buyInstruments = true;
    if (sellInstruments === "true") query.sellInstruments = true;
    if (offerMusicLessons === "true") query.offerMusicLessons = true;

    if (query.$and.length === 0) delete query.$and;

    /* ---------------- FETCH FROM DB ---------------- */

    const totalCount = await Business.countDocuments(query);

    let businesses = await Business.find(query)
      .skip(skip)
      .limit(limitNumber)
      .lean();

    /* ---------------- PRICE FILTER (JS SIDE) ---------------- */

    if (minPrice || maxPrice) {
      const min = minPrice ? Number(minPrice) : 0;
      const max = maxPrice ? Number(maxPrice) : Number.MAX_SAFE_INTEGER;

      businesses = businesses.filter((b) => {
        const items = [...(b.services || []), ...(b.musicLessons || [])];

        return items.some((item) => {
          if (item.pricingType === "range") {
            const minP = Number(item.minPrice);
            const maxP = Number(item.maxPrice);
            if (isNaN(minP) || isNaN(maxP)) return false;
            return minP <= max && maxP >= min;
          }

          const price = Number(item.price);
          if (isNaN(price)) return false;
          return price >= min && price <= max;
        });
      });
    }

    /* ---------------- OPEN NOW ---------------- */

    if (openNow === "true") {
      const now = new Date();
      const day = now
        .toLocaleString("en-us", { weekday: "long" })
        .toLowerCase();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      businesses = businesses.filter((b) => {
        const today = b.businessHours?.find(
          (h) => h.day.toLowerCase() === day && h.enabled
        );
        if (!today) return false;

        const start =
          parseInt(today.startTime.split(":")[0]) * 60 +
          parseInt(today.startTime.split(":")[1]);
        const end =
          parseInt(today.endTime.split(":")[0]) * 60 +
          parseInt(today.endTime.split(":")[1]);

        return currentMinutes >= start && currentMinutes <= end;
      });
    }

    /* ---------------- SORT ---------------- */

    if (sort) {
      const getMinPrice = (b) => {
        const prices = [...(b.services || []), ...(b.musicLessons || [])]
          .map((x) =>
            x.pricingType === "range" ? Number(x.minPrice) : Number(x.price)
          )
          .filter((n) => !isNaN(n));

        return prices.length ? Math.min(...prices) : Infinity;
      };

      businesses.sort((a, b) =>
        sort === "high-to-low"
          ? getMinPrice(b) - getMinPrice(a)
          : getMinPrice(a) - getMinPrice(b)
      );
    }

    return res.status(200).json({
      success: true,
      data: businesses,
      pagination: {
        total: totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};


//!------------------------------------------------------

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
    // console.log("Fetching approved businesses for user:", email);
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    const businesses = await Business.find({
      user: user._id,
      status: "approved",
    });

    // console.log("Found businesses:", businesses);
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
