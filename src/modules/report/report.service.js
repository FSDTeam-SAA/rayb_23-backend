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

const reportService = {
  addReport,
};

module.exports = reportService;
