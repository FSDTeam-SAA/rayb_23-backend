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

const getMyServiceOffered = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("User not found");
  }

  const business = await Business.findOne({ user: user._id });
  if (!business) {
    throw new Error("Business not found for the user");
  }

  const services = await ServiceOffered.find({
    businessId: business._id,
  }).populate("userId", "name email");
  return services;
};

const addServicePricing = async (email, payload, serviceOfferedId) => {
  const { instruments } = payload;

  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  const business = await Business.findOne({ user: user._id });
  if (!business) throw new Error("Business not found for the user");

  const serviceOffered = await ServiceOffered.findById(serviceOfferedId);
  if (!serviceOffered) throw new Error("Service Offered not found");

  instruments.forEach(({ instrumentName, services }) => {
    const instrument = serviceOffered.instrumentName.find(
      (inst) => inst.name === instrumentName
    );

    if (!instrument) {
      throw new Error(`Instrument ${instrumentName} not found`);
    }

    instrument.services = services;
  });

  await serviceOffered.save();
  return serviceOffered;
};

const serviceOfferedService = {
  createServiceOffered,
  getMyServiceOffered,
  addServicePricing,
};

module.exports = serviceOfferedService;
