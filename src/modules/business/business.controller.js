const { default: status } = require("http-status");
const Business = require("./business.model");
const { sendImageToCloudinary } = require("../../utils/cloudnary");

// Create new business
exports.createBusiness = async (req, res) => {
  try {
    const { email: userEmail } = req.user;
    if (!userEmail) {
      return res.status(400).json({
        status: false,
        message: "User not found",
      });
    }

    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        code: 500,
        message: "At least one image is required",
      });
    }

    // Upload all images to Cloudinary and collect URLs
    const uploadedImages = await Promise.all(
      files.map(async (file) => {
        const imageName = `business/${Date.now()}_${file.originalname}`;
        const path = file.path;
        const { secure_url } = await sendImageToCloudinary(imageName, path);
        return secure_url;
      })
    );

    const newBusiness = new Business({
      businessInfo: {
        businessName: req.body.businessName,
        businessPhoto: uploadedImages, // Array of URLs
        businessAddress: req.body.businessAddress,
        businessPhone: req.body.businessPhone,
        businessEmail: req.body.businessEmail,
        businessWebsite: req.body.businessWebsite,
        businessDescription: req.body.businessDescription
      },
      instrumentInfo: req.body.instrumentInfo || [],
      lessonServicePrice: req.body.lessonServicePrice || {},
      businessHours: req.body.businessHours || [],
      userEmail // Associate the business with the user's email
    });

    const savedBusiness = await newBusiness.save();
    res.status(201).json({
      status: true,
      message: "Business created successfully",
      data: savedBusiness
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Get all businesses
exports.getAllBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find();
    res.status(200).json({
        status: true,
        message: "Businesses retrieved successfully",
        data: businesses
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single business by ID
exports.getBusinessById = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }
    res.status(200).json(business);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update business
exports.updateBusiness = async (req, res) => {
  try {
    const updatedBusiness = await Business.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedBusiness) {
      return res.status(404).json({ message: "Business not found" });
    }
    res.status(200).json(updatedBusiness);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete business
exports.deleteBusiness = async (req, res) => {
  try {
    const deletedBusiness = await Business.findByIdAndDelete(req.params.id);
    if (!deletedBusiness) {
      return res.status(404).json({ message: "Business not found" });
    }
    res.status(200).json({ message: "Business deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
