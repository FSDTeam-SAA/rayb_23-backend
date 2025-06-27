const config = require("../../config");
const { sendImageToCloudinary } = require("../../utils/cloudnary");
const sendEmail = require("../../utils/sendEmail");
const { createToken } = require("../../utils/tokenGenerate");
const verificationCodeTemplate = require("../../utils/verificationCodeTemplate");
const User = require("./user.model");
const bcrypt = require("bcrypt");

const createNewAccountInDB = async (payload) => {
  const existingUser = await User.findOne({ email: payload.email });
  if (existingUser) {
    throw new Error("User already exists");
  }

  if (payload.password.length < 6) {
    throw new Error("Password must be at least 6 characters long");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

  let result;

  if (existingUser && !existingUser.isVerified) {
    existingUser.otp = hashedOtp;
    existingUser.otpExpires = otpExpires;
    await existingUser.save();
    result = existingUser;
  } else {
    const newUser = new User({
      ...payload,
      otp: hashedOtp,
      otpExpires,
      isVerified: false,
    });
    result = await newUser.save();
  }

  await sendEmail({
    to: result.email,
    subject: "Verify your email",
    html: verificationCodeTemplate(otp),
  });

  const JwtToken = {
    userId: result._id,
    email: result.email,
    role: result.role,
  };

  const accessToken = createToken(
    JwtToken,
    config.JWT_SECRET,
    config.JWT_EXPIRES_IN
  );

  const refreshToken = createToken(
    JwtToken,
    config.refreshTokenSecret,
    config.jwtRefreshTokenExpiresIn
  );

  return {
    user: {
      _id: result._id,
      name: result.name,
      email: result.email,
      role: result.role,
    },
    accessToken,
    refreshToken,
  };
};

const verifyUserEmail = async (payload, email) => {
  const { otp } = payload;
  if (!otp) throw new Error("OTP is required");

  const existingUser = await User.findOne({ email });
  if (!existingUser) throw new Error("User not found");

  if (!existingUser.otp || !existingUser.otpExpires) {
    throw new Error("OTP not requested or expired");
  }

  if (existingUser.otpExpires < new Date()) {
    throw new Error("OTP has expired");
  }

  if (existingUser.isVerified === true) {
    throw new Error("User already verified");
  }

  const isOtpMatched = await bcrypt.compare(otp.toString(), existingUser.otp);
  if (!isOtpMatched) throw new Error("Invalid OTP");

  const result = await User.findOneAndUpdate(
    { email },
    {
      isVerified: true,
      $unset: { otp: "", otpExpires: "" },
    },
    { new: true }
  ).select("-password -otp -otpExpires");
  return result;
};

const resendOtpCode = async ({ email }) => {
  const existingUser = await User.findOne({ email });
  console.log(existingUser);
  if (!existingUser) throw new Error("User not found");

  if (existingUser.isVerified) {
    throw new Error("User already verified");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

  const result = await User.findOneAndUpdate(
    { email },
    {
      otp: hashedOtp,
      otpExpires,
    },
    { new: true }
  ).select("-password -otp -otpExpires");

  await sendEmail({
    to: existingUser.email,
    subject: "Verify your email",
    html: verificationCodeTemplate(otp),
  });
  return result;
};

const getAllUsersFromDb = async () => {
  const users = await User.find({ isVerified: true }).select(
    "-password -otp -otpExpires"
  );
  return users;
};

const getMyProfileFromDb = async (email) => {
  const user = await User.findOne(email).select("-password -otp -otpExpires");
  if (!user) throw new Error("User not found");
  return user;
};

const updateUserProfile = async (payload, email, file) => {
  const isExistingUser = await User.findOne({ email });
  if (!isExistingUser) throw new Error("User not found");

  if (file) {
    const imageName = `${Date.now()}-${file.originalname}`;
    const path = file?.path;
    const { secure_url } = await sendImageToCloudinary(imageName, path);
    payload.imageLink = secure_url;
  }

  const updatedUser = await User.findOneAndUpdate(
    {
      email,
    },
    payload,
    { new: true }
  ).select("-password -otp -otpExpires");
  return updatedUser;
};

const userService = {
  createNewAccountInDB,
  verifyUserEmail,
  resendOtpCode,
  getAllUsersFromDb,
  getMyProfileFromDb,
  updateUserProfile,
};

module.exports = userService;
