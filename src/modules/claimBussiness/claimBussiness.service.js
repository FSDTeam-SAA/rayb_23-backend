const { default: mongoose } = require("mongoose");
const { sendImageToCloudinary } = require("../../utils/cloudnary");
const sendEmail = require("../../utils/sendEmail");
const verificationCodeTemplate = require("../../utils/verificationCodeTemplate");
const BusinessModel = require("../business/business.model");
const User = require("../user/user.model");
const ClaimBussiness = require("./claimBussiness.model");
const bcrypt = require("bcrypt");

const documentVerification = async (payload, email, files, bussinessId) => {
  // ✅ find user
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");
  if (!user.isActive) throw new Error("User is not active");

  // ✅ find business
  const business = await BusinessModel.findById(bussinessId);
  if (!business) throw new Error("Business not found");

  // ✅ upload files
  let uploadedDocuments = [];

  if (files && Array.isArray(files) && files.length > 0) {
    uploadedDocuments = await Promise.all(
      files.map(async (file) => {
        const imageName = `business/${Date.now()}_${file.originalname}`;
        const result = await sendImageToCloudinary(imageName, file.path);
        return result.secure_url;
      })
    );
  }

  console.log("📄 Uploaded documents:", uploadedDocuments);

  // ✅ update or create ClaimBussiness
  const filter = {
    bussinessId: new mongoose.Types.ObjectId(business._id),
    userId: new mongoose.Types.ObjectId(user._id),
  };

  const update = {
    ...payload,
    documents: uploadedDocuments, // replace old documents with new
  };

  const options = { new: true, upsert: true };

  const result = await ClaimBussiness.findOneAndUpdate(
    filter,
    { $set: update },
    options
  ).populate("userId", "name email number");

  console.log("✅ ClaimBussiness updated:", result._id);

  return result;
};
const getAllClaimBussiness = async () => {
  const result = await ClaimBussiness.find({}).populate({
    path: "userId",
    select: "name email number",
  });
  return result;
};

const getMyClaimBussiness = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  if (!user.isActive) throw new Error("User is not active");

  const result = await ClaimBussiness.findOne({ userId: user._id }).populate({
    path: "userId",
    select: "name email number",
  });
  return result;
};

const toggleClaimBussinessStatus = async (bussinessId, payload) => {
  const { status } = payload;

  const businessClaim = await ClaimBussiness.findById(bussinessId);
  if (!businessClaim) throw new Error("Business claim not found");

  const result = await ClaimBussiness.findOneAndUpdate(
    { _id: bussinessId },
    { $set: { status } },
    { new: true }
  ).populate("userId", "name email number");
  return result;
};

const sendOtp = async (payload, bussinessId) => {
  const { email } = payload;

  const bussiness = await BusinessModel.findById(bussinessId);
  if (!bussiness) throw new Error("Business not found");

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

  await BusinessModel.findOneAndUpdate(
    { _id: bussinessId },
    { $set: { otp: hashedOtp, otpExpires } },
    { new: true }
  );

  await sendEmail({
    to: email,
    subject: "Verify your email",
    html: verificationCodeTemplate(otp),
  });
};

const bussinessEmailVerify = async (userEmail, bussinessId, payload) => {
  const { otp } = payload;

  const bussiness = await BusinessModel.findById(bussinessId);
  if (!bussiness) throw new Error("Business not found");

  const user = await User.findOne({ email: userEmail });
  if (!user) throw new Error("User not found");
  if (!user.isActive) throw new Error("User is not active");

  if (!bussiness.otp || !bussiness.otpExpires) {
    throw new Error("OTP not requested or already expired");
  }

  if (bussiness.otpExpires < new Date()) {
    throw new Error("OTP has expired");
  }

  const isOtpMatched = await bcrypt.compare(otp.toString(), bussiness.otp);
  if (!isOtpMatched) throw new Error("Invalid OTP");

  bussiness.otp = null;
  bussiness.otpExpires = null;
  await bussiness.save();

  const newClaim = await ClaimBussiness.create({
    bussinessId: bussiness._id,
    userId: user._id,
    status: "Pending",
    isVerified: false,
    isMailVerified: true,
    otp: null,
    otpExpires: null,
  });

  return newClaim;
};

const claimBussinessService = {
  documentVerification,
  getAllClaimBussiness,
  getMyClaimBussiness,
  toggleClaimBussinessStatus,
  sendOtp,
  bussinessEmailVerify,
};

module.exports = claimBussinessService;
