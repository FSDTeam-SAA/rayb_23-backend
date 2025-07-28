const Business = require("../business/business.model");
const User = require("../user/user.model");
const Report = require("./report.model");

const addReport = async (payload, email) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  if (!user.isActive) throw new Error("User is not active");

  const business = await Business.findById(payload.businessId);
  if (!business) throw new Error("Business not found");

  const result = await Report.create({
    ...payload,
    userId: user._id,
    businessId: business._id,
  });
  return result;
};

const getAllReports = async () => {
  const result = await Report.find({})
    .populate("userId", "name email")
    .populate("businessId", "businessInfo");
  return result;
};

const getMyReports = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  if (!user.isActive) throw new Error("User is not active");

  const result = await Report.find({ userId: user._id })
    .populate("userId", "name email")
    .populate("businessId", "businessInfo");
  return result;
};

const getSingleReport = async (reportId) => {
  const result = await Report.findById(reportId)
    .populate("userId", "name email")
    .populate("businessId", "businessInfo");
  return result;
};

const toggleReport = async (reportId, payload) => {
  const { status } = payload;
  const result = await Report.findByIdAndUpdate(
    reportId,
    { status },
    { new: true }
  );
  return result;
};

const reportService = {
  addReport,
  getAllReports,
  getMyReports,
  getSingleReport,
  toggleReport,
};

module.exports = reportService;
