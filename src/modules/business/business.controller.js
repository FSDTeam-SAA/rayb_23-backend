const Business = require("./business.model");
const NotifyModel = require("./business.model");
const { sendImageToCloudinary } = require("../../utils/cloudnary");
const { Instrument } = require("../instrument/instrument.model");
const { LessonService } = require("../lessonService/lessonService.model");
const User = require("../user/user.model")
const fs = require("fs");
const createNotification = require("../../utils/createNotification");
const { default: status } = require("http-status");
// Create new business
exports.createBusiness = async (req, res) => {
  try {
    const { email: userEmail, userId: userID } = req.user;

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        code: 500,
        message: "At least one image is required",
      });
    }

    // Parse data from form-data field
    const data = JSON.parse(req.body.data);

    // Upload images to Cloudinary
    const uploadedImages = await Promise.all(
      files.map(async (file) => {
        const imageName = `business/${Date.now()}_${file.originalname}`;
        const { secure_url } = await sendImageToCloudinary(
          imageName,
          file.path
        );
        return secure_url;
      })
    );

    // Save instrumentInfo in its own collection
    const savedInstruments = await Instrument.insertMany(
      data.instrumentInfo || []
    );
    const instrumentIds = savedInstruments.map((inst) => inst._id);

    // Save lessonServicePrice in its own collection
    const lessonService = new LessonService(data.lessonServicePrice || {});
    const savedLessonService = await lessonService.save();

    // Create Business with references
    const newBusiness = new Business({
      businessInfo: {
        ...data.businessInfo,
        image: uploadedImages,
      },
      instrumentInfo: instrumentIds,
      lessonServicePrice: savedLessonService._id,
      businessHours: data.businessHours || [],
      user: user._id,
    });

    const savedBusiness = await newBusiness.save();
    const message = `${req.user.name} has added a new Business name : ${data.businessInfo.name}`
    createNotification(userID, message, "Business");
    if (savedBusiness) {
      return res.status(201).json({
        status: true,
        message: "Business created successfully",
        data: savedBusiness,
      });
    }

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// get all business 

exports.getAllBusinesses = async (req, res) => {
  try {
    const {
      search = "",
      instrumentFamily,
      instrumentName,
      serviceName,
      minPrice,
      maxPrice,
      sellInstruments,
      buyInstruments,
      tradeInstruments,
      page = 1,
      limit = 10
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query filter
    const filter = {
      status: "active",
      "businessInfo.name": { $regex: search, $options: "i" }
    };

    // Step 1: Find businesses with base filters
    let businessesQuery = Business.find(filter)
      .populate("instrumentInfo")
      .populate("lessonServicePrice")
      .populate({
        path: "review",
        match: { status: "approved" },
        populate: {
          path: "user",
          select: "name email",
        },
      })
      .populate("user", "name email role");

    // Step 2: Apply pagination
    businessesQuery = businessesQuery.skip(skip).limit(limitNum);

    let businesses = await businessesQuery.exec();

    // Step 3: Apply in-memory filter on populated instrumentInfo
    businesses = businesses.filter(business => {
      const instrumentList = business.instrumentInfo || [];

      return instrumentList.some(inst => {
        const matchFamily = instrumentFamily ? inst.instrumentFamily === instrumentFamily : true;
        const matchName = instrumentName ? inst.instrumentsName.includes(instrumentName) : true;
        const matchService = serviceName ? inst.serviceName === serviceName : true;

        const priceMatch = inst.servicesPrice?.some(price => {
          if (price.priceType === "Range" && price.rangePrice) {
            const minMatch = minPrice ? price.rangePrice.min >= Number(minPrice) : true;
            const maxMatch = maxPrice ? price.rangePrice.max <= Number(maxPrice) : true;
            return minMatch && maxMatch;
          }
          return true;
        }) ?? true;

        const matchSell = sellInstruments === "true" ? inst.buySellTrade?.sellInstruments : true;
        const matchBuy = buyInstruments === "true" ? inst.buySellTrade?.buyInstruments : true;
        const matchTrade = tradeInstruments === "true" ? inst.buySellTrade?.tradeInstruments : true;

        return matchFamily && matchName && matchService && priceMatch && matchSell && matchBuy && matchTrade;
      });
    });

    const total = await Business.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      success: true,
      message: "Businesses fetched successfully",
      currentPage: pageNum,
      totalPages,
      totalItems: total,
      data: businesses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// Get all approve businesses
exports.getAllBusinessesAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // default page = 1
    const limit = parseInt(req.query.limit) || 10; // default limit = 10
    const skip = (page - 1) * limit;

    const total = await Business.countDocuments();

    const filter = {
      status: "active",
      "businessInfo.name": { $regex: search, $options: "i" }
    };

    const businesses = await Business.find(filter)
      .skip(skip)
      .limit(limit)
      .populate("instrumentInfo")
      .populate("lessonServicePrice")
      .populate({
        path: "review",
        populate: {
          path: "user",
          select: "name email",
        },
      })
      .populate("user", "name email role");

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: "Businesses fetched successfully",
      currentPage: page,
      totalPages,
      totalItems: total,
      data: businesses,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


//_____________________
// Get business by ID
exports.getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;
    const business = await Business.findById(id)
      .populate("instrumentInfo")
      .populate("lessonServicePrice")
      .populate("user", "name email role");
    if (!business) {
      return res
        .status(404)
        .json({ success: false, message: "Business not found" });
    }
    res.status(200).json({ success: true, data: business });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//get user
exports.getBusinessesByUser = async (req, res) => {
  try {


    const { userId: userID } = req.user;


    const isExist = await User.findById({ _id: userID });
    if (!isExist) {
      return res.status(400).json({
        status: false,
        message: "User not found.",
      });
    }

    const businesses = await Business.find({ user: userID })
      .populate("instrumentInfo")
      .populate("lessonServicePrice")
      .populate("user", "name email role");

    if (!businesses || businesses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No businesses found for this user",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Businesses fetched successfully",
      data: businesses,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//_____________________
// Update business
exports.updateBusiness = async (req, res) => {
  try {
    const { email: userEmail, userId } = req.user;
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ status: false, message: "Business ID is required" });
    }

    if (!req.body.data) {
      return res.status(400).json({
        success: false,
        message: "Missing 'data' field in form-data",
      });
    }

    const data = JSON.parse(req.body.data);

    // ✅ Optional image upload
    let uploadedImages;
    if (req.files && req.files.length > 0) {
      uploadedImages = await Promise.all(
        req.files.map(async (file) => {
          const imageName = `business/${Date.now()}_${file.originalname}`;
          const { secure_url } = await sendImageToCloudinary(
            imageName,
            file.path
          );
          fs.unlinkSync(file.path);
          return secure_url;
        })
      );
    }

    // ✅ Save new instrumentInfo if provided
    let instrumentIds = [];
    if (data.instrumentInfo && Array.isArray(data.instrumentInfo)) {
      const savedInstruments = await Instrument.insertMany(data.instrumentInfo);
      instrumentIds = savedInstruments.map((inst) => inst._id);
    }

    // ✅ Save new lessonServicePrice if provided
    let savedLessonServiceId = null;
    if (data.lessonServicePrice) {
      const lessonService = new LessonService(data.lessonServicePrice);
      const savedLessonService = await lessonService.save();
      savedLessonServiceId = savedLessonService._id;
    }

    // ✅ Prepare update payload
    const updatePayload = {
      businessInfo: {
        ...data.businessInfo,
        ...(uploadedImages && { image: uploadedImages }),
      },
      businessHours: data.businessHours || [],
    };

    if ("status" in data) updatePayload.status = data.status;
    if (instrumentIds.length) updatePayload.instrumentInfo = instrumentIds;
    if (savedLessonServiceId)
      updatePayload.lessonServicePrice = savedLessonServiceId;

    const updatedBusiness = await Business.findByIdAndUpdate(id, updatePayload, {
      new: true,
    });
    const message = `${data.businessInfo.name}: business has been updated`
    createNotification(userId, message, "Business");
    if (!updatedBusiness) {
      return res
        .status(404)
        .json({ success: false, message: "Business not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Business updated successfully",
      data: updatedBusiness,
    });
  } catch (error) {
    console.error("Update business error:", error);
    return res.status(500).json({ error: error.message });
  }
};

//_____________________
// Delete business
exports.deleteBusiness = async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;
    const business = await Business.findById(id);
    const message = `${req.user.name} has deleted his business.`
    createNotification(userId, message, "Business");

    if (!business) {
      return res
        .status(404)
        .json({ success: false, message: "Business not found" });
    }

    // Delete related instrument and lesson documents
    await Instrument.deleteMany({ _id: { $in: business.instrumentInfo } });
    await LessonService.findByIdAndDelete(business.lessonServicePrice);

    await Business.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: "Business deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
