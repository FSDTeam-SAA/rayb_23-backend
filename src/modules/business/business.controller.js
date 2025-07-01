const Business = require("./business.model");
const { sendImageToCloudinary } = require("../../utils/cloudnary");
const { Instrument } = require("../instrument/instrument.model");
const { LessonService } = require("../lessonService/lessonService.model");
const User = require("../user/user.model")
const fs = require("fs");
// Create new business
exports.createBusiness = async (req, res) => {
  try {
    const { email: userEmail } = req.user;
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

    res.status(201).json({
      status: true,
      message: "Business created successfully",
      data: savedBusiness,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all businesses
exports.getAllBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find({status: "active"})
      .populate("instrumentInfo")
      .populate("lessonServicePrice")
      .populate("user", "name email role");
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

exports.getBusinessesByUser = async (req, res) => {
  try {


    const { userId:userID } = req.user;
    

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
    const { email: userEmail } = req.user;
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    // Ensure business ID is provided
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ status: false, message: "Business ID is required" });
    }

    // Ensure 'data' field exists
    if (!req.body.data) {
      return res
        .status(400)
        .json({ success: false, message: "Missing 'data' field in form-data" });
    }

    const data = JSON.parse(req.body.data);

    // Optionally update image(s)
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

    // Save new instruments if provided
    let instrumentIds = [];
    if (data.instrumentInfo && Array.isArray(data.instrumentInfo)) {
      const savedInstruments = await Instrument.insertMany(data.instrumentInfo);
      instrumentIds = savedInstruments.map((inst) => inst._id);
    }

    // Save new lesson service if provided
    let savedLessonServiceId = null;
    if (data.lessonServicePrice) {
      const lessonService = new LessonService(data.lessonServicePrice);
      const savedLessonService = await lessonService.save();
      savedLessonServiceId = savedLessonService._id;
    }

    // Prepare update object
    const updatePayload = {
      businessInfo: {
        ...data.businessInfo,
        ...(uploadedImages && { image: uploadedImages }),
      },
      businessHours: data.businessHours || [],
    };

    if (instrumentIds.length) updatePayload.instrumentInfo = instrumentIds;
    if (savedLessonServiceId)
      updatePayload.lessonServicePrice = savedLessonServiceId;

    const updatedBusiness = await Business.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true }
    );

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
    const { id } = req.params;
    const business = await Business.findById(id);
    if (!business) {
      return res
        .status(404)
        .json({ success: false, message: "Business not found" });
    }

    // Delete related instrument and lesson documents
    await Instrument.deleteMany({ _id: { $in: business.instrumentInfo } });
    await LessonService.findByIdAndDelete(business.lessonServicePrice);

    await Business.findByIdAndDelete(id);
    res
      .status(200)
      .json({ success: true, message: "Business deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
