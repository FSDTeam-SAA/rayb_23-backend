const { sendImageToCloudinary } = require("../../utils/cloudnary");
const sendEmail = require("../../utils/sendEmail");
const verificationCodeTemplate = require("../../utils/verificationCodeTemplate");
const BusinessModel = require("../business/business.model");
const User = require("../user/user.model");
const ClaimBussiness = require("./claimBussiness.model");
const bcrypt = require("bcrypt");

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
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  const bussiness = await BusinessModel.findById(bussinessId);
  if (!bussiness) throw new Error("Business not found");

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

  //TODO: there are some logic will be build who verify email then we store those userId in ClaimBussiness.userId........ [if don't have any userId then we do it]

  await ClaimBussiness.findOneAndUpdate(
    { bussinessId: bussiness._id },
    { $set: { otp: hashedOtp, otpExpires } },
    { new: true }
  );

  await sendEmail({
    to: email,
    subject: "Verify your email",
    html: verificationCodeTemplate(otp),
  });
};

const bussinessEmailVerify = async (bussinessId, payload) => {
  const { otp, email } = payload;

  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");
  if (!user.isActive) throw new Error("User is not active");

  const existingClaim = await ClaimBussiness.findOne({
    bussinessId: bussinessId,
    userId: user._id,
  });

  if (existingClaim && existingClaim.isMailVerified) {
    throw new Error("Business already verified");
  }

  if (existingClaim) {
    if (!existingClaim.otp || !existingClaim.otpExpires) {
      throw new Error("OTP not requested or expired");
    }
    if (existingClaim.otpExpires < new Date()) {
      throw new Error("OTP has expired");
    }

    const isOtpMatched = await bcrypt.compare(
      otp.toString(),
      existingClaim.otp
    );
    if (!isOtpMatched) throw new Error("Invalid OTP");

    const updatedClaim = await ClaimBussiness.findOneAndUpdate(
      { _id: existingClaim._id },
      {
        $set: {
          isMailVerified: true,
          otp: null,
          otpExpires: null,
        },
      },
      { new: true }
    ).populate("userId", "name email number");

    return updatedClaim;
  }

  const newClaim = await ClaimBussiness.create({
    bussinessId,
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
