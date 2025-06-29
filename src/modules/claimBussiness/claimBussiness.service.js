const { sendImageToCloudinary } = require("../../utils/cloudnary");
const BusinessModel = require("../business/business.model");
const User = require("../user/user.model");
const ClaimBussiness = require("./claimBussiness.model");

const verifyPhoneNumber = async () => {};

const documentVerification = async (payload, email, files, bussinessId) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");
  if (!user.isActive) throw new Error("User is not active");

  const business = await BusinessModel.findById(bussinessId);
  if (!business) throw new Error("Business not found");

  const existingClaim = await ClaimBussiness.findOne({ bussinessId });
  if (existingClaim) throw new Error("Claim business already exists");

  let uploadedImages = [];

  if (files && Array.isArray(files) && files.length > 0) {
    uploadedImages = await Promise.all(
      files.map(async (file) => {
        const imageName = `business/${Date.now()}_${file.originalname}`;
        const result = await sendImageToCloudinary(imageName, file.path);
        return result.secure_url;
      })
    );
  }

  const newClaim = await ClaimBussiness.create({
    ...payload,
    documents: uploadedImages,
    bussinessId,
    userId: user._id,
    status: "Pending",
    isVerified: false,
  });

  return newClaim;
};

const getAllClaimBussiness = async () => {
  const result = await ClaimBussiness.find({})
    .populate({
      path: "userId",
      select: "name email number", 
    })
  return result;
};

const claimBussinessService = {
  verifyPhoneNumber,
  documentVerification,
  getAllClaimBussiness,
};

module.exports = claimBussinessService;
