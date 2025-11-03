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

    // const notifyUser = await Notification.create({
    //   senderId: user._id,
    //   receiverId: user._id,
    //   userType: userType,
    //   type: "business_submission",
    //   title: "Business Created",
    //   message: `You have successfully created a business.`,
    //   metadata: { businessId: business._id },
    // });
    // io.to(`${user._id}`).emit("new_notification", notifyUser);

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

    // -------- SEARCH --------
    if (search) {
      const searchTerms = Array.isArray(search) ? search : [search];
      const searchRegexArray = searchTerms.map(
        (term) =>
          new RegExp(
            term.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "i"
          )
      );

      const searchConditions = searchRegexArray.flatMap((searchRegex) => [
        { "businessInfo.name": searchRegex },
        { "services.newInstrumentName": searchRegex },
        { "musicLessons.newInstrumentName": searchRegex },
        { "services.selectedInstrumentsGroup": searchRegex },
        { "musicLessons.selectedInstrumentsGroupMusic": searchRegex },
        { "businessInfo.address": searchRegex },
        { "services.instrumentFamily": searchRegex },
      ]);

      if (searchTerms.length > 1) {
        query.$and = searchRegexArray.map((searchRegex) => ({
          $or: [
            { "businessInfo.name": searchRegex },
            { "services.newInstrumentName": searchRegex },
            { "musicLessons.newInstrumentName": searchRegex },
            { "services.selectedInstrumentsGroup": searchRegex },
            { "musicLessons.selectedInstrumentsGroupMusic": searchRegex },
            { "businessInfo.address": searchRegex },
            { "services.instrumentFamily": searchRegex },
          ],
        }));
      } else {
        query.$or = searchConditions;
      }
    }

    // -------- POSTAL CODE --------
    if (postalCode) {
      const postalCodeTerms = Array.isArray(postalCode)
        ? postalCode
        : [postalCode];
      const postalCodeRegexArray = postalCodeTerms.map(
        (term) =>
          new RegExp(
            term.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "i"
          )
      );
      if (postalCodeRegexArray.length > 1) {
        query["businessInfo.address"] = { $in: postalCodeRegexArray };
      } else {
        query["businessInfo.address"] = postalCodeRegexArray[0];
      }
    }

    // -------- INSTRUMENT FAMILY --------
    if (instrumentFamily) {
      const instrumentFamilyTerms = Array.isArray(instrumentFamily)
        ? instrumentFamily
        : [instrumentFamily];
      const instrumentFamilyRegexArray = instrumentFamilyTerms.map(
        (term) =>
          new RegExp(
            term.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "i"
          )
      );

      if (instrumentFamilyRegexArray.length > 1) {
        query["services.instrumentFamily"] = {
          $in: instrumentFamilyRegexArray,
        };
      } else {
        query["services.instrumentFamily"] = instrumentFamilyRegexArray[0];
      }
    }

    // -------- SELECTED INSTRUMENT GROUP --------
    if (selectedInstrumentsGroup) {
      const groupTerms = Array.isArray(selectedInstrumentsGroup)
        ? selectedInstrumentsGroup
        : [selectedInstrumentsGroup];
      const groupRegexArray = groupTerms.map(
        (term) =>
          new RegExp(
            term.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "i"
          )
      );
      const groupConditions = groupRegexArray.flatMap((groupRegex) => [
        { "services.selectedInstrumentsGroup": groupRegex },
        { "musicLessons.selectedInstrumentsGroupMusic": groupRegex },
      ]);

      if (groupTerms.length > 1) {
        if (!query.$and) query.$and = [];
        query.$and.push({ $or: groupConditions });
      } else {
        if (query.$or) query.$or.push(...groupConditions);
        else query.$or = groupConditions;
      }
    }

    // -------- NEW INSTRUMENT NAME --------
    if (newInstrumentName) {
      const instrumentNameTerms = Array.isArray(newInstrumentName)
        ? newInstrumentName
        : [newInstrumentName];
      const instrumentNameRegexArray = instrumentNameTerms.map(
        (term) =>
          new RegExp(
            term.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "i"
          )
      );
      const instrumentNameConditions = instrumentNameRegexArray.flatMap(
        (instrumentNameRegex) => [
          { "services.newInstrumentName": instrumentNameRegex },
          { "musicLessons.newInstrumentName": instrumentNameRegex },
          { "services.instrumentFamily": instrumentNameRegex },
        ]
      );
      if (instrumentNameTerms.length > 1) {
        if (!query.$and) query.$and = [];
        query.$and.push({ $or: instrumentNameConditions });
      } else {
        if (query.$or) query.$or.push(...instrumentNameConditions);
        else query.$or = instrumentNameConditions;
      }
    }

    // -------- PRICE RANGE --------
    if (minPrice || maxPrice) {
      const minPriceNum = minPrice ? parseFloat(minPrice) : 0;
      const maxPriceNum = maxPrice
        ? parseFloat(maxPrice)
        : Number.MAX_SAFE_INTEGER;

      const priceQuery = {
        $or: [
          { "services.price": { $gte: minPriceNum, $lte: maxPriceNum } },
          { "musicLessons.price": { $gte: minPriceNum, $lte: maxPriceNum } },
          {
            $and: [
              { "services.minPrice": { $gte: minPriceNum } },
              { "services.maxPrice": { $lte: maxPriceNum } },
            ],
          },
          {
            $and: [
              { "musicLessons.minPrice": { $gte: minPriceNum } },
              { "musicLessons.maxPrice": { $lte: maxPriceNum } },
            ],
          },
        ],
      };

      if (query.$and) query.$and.push(priceQuery);
      else query.$and = [priceQuery];
    }

    // -------- OFFERS --------
    if (buyInstruments === "true") query.buyInstruments = true;
    if (sellInstruments === "true") query.sellInstruments = true;
    if (offerMusicLessons === "true") query.offerMusicLessons = true;

    const totalCount = await Business.countDocuments(query);

    let businessesQuery = Business.find(query)
      .populate("review", "rating") // ensure ratings are available
      .skip(skip)
      .limit(limitNumber);

    // -------- OPEN NOW FILTER --------
    if (openNow === "true") {
        const now = new Date();
        const currentDay = now
          .toLocaleString("en-us", { weekday: "long" })
          .toLowerCase();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        let businesses = await businessesQuery;

        businesses = businesses.filter((business) => {
          const todayHours = business.businessHours.find(
            (h) => h.day.toLowerCase() === currentDay && h.enabled
          );

          if (!todayHours) return false;

          const [startH, startM] = todayHours.startTime.split(":").map(Number);
          const [endH, endM] = todayHours.endTime.split(":").map(Number);

          // ✅ convert to 24-hour format correctly
          let startHour24 = startH % 12;
          let endHour24 = endH % 12;

          if (todayHours.startMeridiem === "PM") startHour24 += 12;
          if (todayHours.endMeridiem === "PM") endHour24 += 12;

          const startMinutes = startHour24 * 60 + startM;
          const endMinutes = endHour24 * 60 + endM;

          // ✅ handle overnight case (e.g. 8 PM – 2 AM)
          if (endMinutes < startMinutes) {
            return currentTime >= startMinutes || currentTime <= endMinutes;
          }

          return currentTime >= startMinutes && currentTime <= endMinutes;
        });

      // -------- SORT LOGIC --------
      if (sort) {
        const getMinPrice = (business) => {
          const servicePrices = business.services.map((s) =>
            s.pricingType === "range" && s.minPrice
              ? parseFloat(s.minPrice)
              : s.price
              ? parseFloat(s.price)
              : Infinity
          );
          const lessonPrices = business.musicLessons.map((l) =>
            l.pricingType === "range" && l.minPrice
              ? parseFloat(l.minPrice)
              : l.price
              ? parseFloat(l.price)
              : Infinity
          );
          const allPrices = [...servicePrices, ...lessonPrices].filter(
            (p) => !isNaN(p) && p !== Infinity
          );
          return allPrices.length > 0 ? Math.min(...allPrices) : Infinity;
        };

        const getAverageRating = (business) => {
          if (!business.review || business.review.length === 0)
            return 0;
          const ratings = business.review
            .map((r) => parseFloat(r.rating))
            .filter((r) => !isNaN(r));
          if (ratings.length === 0) return 0;
          return ratings.reduce((a, b) => a + b, 0) / ratings.length;
        };

        businesses.sort((a, b) => {
          const aPrice = getMinPrice(a);
          const bPrice = getMinPrice(b);
          const aRating = getAverageRating(a);
          const bRating = getAverageRating(b);

          if (sort === "high-to-low") return bPrice - aPrice;
          if (sort === "low-to-high") return aPrice - bPrice;
          if (sort === "rating-high-to-low") return bRating - aRating;
          if (sort === "rating-low-to-high") return aRating - bRating;
          return 0;
        });
      }

      const paginatedBusinesses = businesses.slice(skip, skip + limitNumber);

      return res.status(200).json({
        success: true,
        message: "Businesses fetched successfully",
        data: paginatedBusinesses,
        pagination: {
          total: businesses.length,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(businesses.length / limitNumber),
        },
      });
    }

    // -------- NON OPEN-NOW SORT --------
    let businesses = await businessesQuery.lean();

    if (sort) {
      const getMinPrice = (business) => {
        const servicePrices = business.services.map((s) =>
          s.pricingType === "range" && s.minPrice
            ? parseFloat(s.minPrice)
            : s.price
            ? parseFloat(s.price)
            : Infinity
        );
        const lessonPrices = business.musicLessons.map((l) =>
          l.pricingType === "range" && l.minPrice
            ? parseFloat(l.minPrice)
            : l.price
            ? parseFloat(l.price)
            : Infinity
        );
        const allPrices = [...servicePrices, ...lessonPrices].filter(
          (p) => !isNaN(p) && p !== Infinity
        );
        return allPrices.length > 0 ? Math.min(...allPrices) : Infinity;
      };

      const getAverageRating = (business) => {
        if (!business.review || business.review.length === 0) return 0;
        const ratings = business.review
          .map((r) => parseFloat(r.rating))
          .filter((r) => !isNaN(r));
        if (ratings.length === 0) return 0;
        return ratings.reduce((a, b) => a + b, 0) / ratings.length;
      };

      businesses.sort((a, b) => {
        const aPrice = getMinPrice(a);
        const bPrice = getMinPrice(b);
        const aRating = getAverageRating(a);
        const bRating = getAverageRating(b);

        if (sort === "high-to-low") return bPrice - aPrice;
        if (sort === "low-to-high") return aPrice - bPrice;
        if (sort === "rating-high-to-low") return bRating - aRating;
        if (sort === "rating-low-to-high") return aRating - bRating;
        return 0;
      });
    }

    const paginatedBusinesses = businesses.slice(skip, skip + limitNumber);

    return res.status(200).json({
      success: true,
      message: "Businesses fetched successfully",
      data: paginatedBusinesses,
      searchCount: totalCount,
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

    // Fetch the business
    const business = await Business.findById(businessId)
      .populate("services")
      .populate("musicLessons")
      // .populate("user", "name email")
      // .populate("adminId", "name email")
      .populate("review");

    if (!business) {
      throw new Error("Business not found");
    }

    // Check if the business has been claimed
    const claim = await ClaimBussiness.findOne({ businessId });

    // Add claim info to the response
    const businessWithClaimStatus = {
      ...business.toObject(),
      isClaimed: !!claim, // true if a claim exists
      claimInfo: claim
        ? {
            userId: claim.userId,
            status: claim.status,
            isVerified: claim.isVerified,
            documents: claim.documents,
          }
        : null,
    };

    return res.status(200).json({
      success: true,
      message: "Business fetched successfully",
      data: businessWithClaimStatus,
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
