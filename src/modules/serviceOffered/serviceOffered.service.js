const Business = require("../business/business.model");
const User = require("../user/user.model");
const ServiceOffered = require("./serviceOffered.model");

const createServiceOffered = async (email, payload) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("User not found");
  }

  const business = await Business.findOne({ user: user._id });
  if (!business) {
    throw new Error("Business not found for the user");
  }

  const serviceOffered = ServiceOffered.create({
    userId: user._id,
    businessId: business._id,
    ...payload,
  });

  return serviceOffered;
};

const serviceOfferedService = {
  createServiceOffered,
};

module.exports = serviceOfferedService;
