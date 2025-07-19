const { sendImageToCloudinary } = require("../../utils/cloudnary");
const { Instrument } = require("../instrument/instrument.model");
const { LessonService } = require("../lessonService/lessonService.model");
const User = require("../user/user.model");
const fs = require("fs");
const {
  createNotification,
  createNotificationAdmin,
} = require("../../utils/createNotification");
const sendNotiFication = require("../../utils/sendNotification");
const Business = require("./business.model");

exports.createBusiness = async (req, res) => {
  try {
    const { email, userType } = req.user;
    const files = req.files;
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("User not found");
    }

    const ownerField = userType === "admin" ? "adminId" : "userId";
    req.body[ownerField] = user._id;

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

    const result = await Business.create({
      ...req.body,
      businessInfo: {
        ...req.body.businessInfo,
        image,
      },
    });

    const business = await Business.findById(result._id);

    res.status(201).json({
      success: true,
      message: "Business created successfully",
      data: business,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getAllBusinesses = async (req, res) => {
  try {
    const result = await Business.find({});

    return res.status(200).json({
      success: true,
      message: "Businesses fetched successfully",
      data: result,
    });
  } catch (error) {
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
    if (!businesses || businesses.length === 0) {
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
    res.status(500).json({ error: error.message });
  }
};


exports.updateBusiness = async (req, res) => {
  try {
    const io = req.app.get("io");
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

    const updatedBusiness = await Business.findByIdAndUpdate(
      id,
      updatePayload,
      {
        new: true,
      }
    );
    const message = `${data.businessInfo.name}: business has been updated`;
    createNotification(userId, message, "Business");
    if (!updatedBusiness) {
      return res
        .status(404)
        .json({ success: false, message: "Business not found" });
    }

    const savedBusiness = await new Business(updatedBusiness).save();
    const message1 = `${user.name} has updated a business: ${savedBusiness.businessInfo.name}`;
    const message2 = `You have updated a business: ${savedBusiness.businessInfo.name}`;
    const saveNotification = await createNotification(
      userId,
      message2,
      "Business Update"
    );
    const saveNotificationAdmin = await createNotificationAdmin(
      userId,
      message1,
      "Business Update"
    );

    await sendNotiFication(io, req, saveNotification, saveNotificationAdmin);

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


exports.deleteBusiness = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { userId } = req.user;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }
    const { id } = req.params;
    const business = await Business.findById(id);
    const message = `${req.user.name} has deleted his business.`;
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
    const message1 = `${user.name} has updated a business: ${savedBusiness.businessInfo.name}`;
    const message2 = `You have updated a business: ${savedBusiness.businessInfo.name}`;
    const saveNotification = await createNotification(
      userId,
      message2,
      "Business Update"
    );
    const saveNotificationAdmin = await createNotificationAdmin(
      userId,
      message1,
      "Business Update"
    );

    await sendNotiFication(io, req, saveNotification, saveNotificationAdmin);

    return res
      .status(200)
      .json({ success: true, message: "Business deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
