const { default: status } = require("http-status");
const Business = require("./business.model");

// Create new business
exports.createBusiness = async (req, res) => {
  try {
    const newBusiness = new Business(req.body);
    const savedBusiness = await newBusiness.save();
    res.status(201).json({
        status:true,
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
    res.status(200).json(businesses);
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
