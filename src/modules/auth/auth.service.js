const config = require("../../config");
const { companyName } = require("../../lib/companyName");
const { createToken } = require("../../utils/tokenGenerate");
const User = require("../user/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const verificationCodeTemplate = require("../../utils/verificationCodeTemplate");
const sendEmail = require("../../utils/sendEmail");


const loginUser = async (payload) => {
  const user = await User.findOne({ email: payload.email }).select("+password");
  if (!user) {
    throw new Error("User not found");
  }

  if (!user.isVerified) {
    throw new Error("Please verify your email address first");
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.password);
  if (!isPasswordValid) {
    throw new Error("Invalid password");
  }

  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.resetPasswordOtp;
  delete userObj.resetPasswordOtpExpires;
  delete userObj.verificationOtp;
  delete userObj.verificationOtpExpires;
  delete userObj.otp;
  delete userObj.otpExpires;

  const tokenPayload = {
    userId: user._id,
    email: user.email,
    userType: user.userType,
  };

  const accessToken = createToken(
    tokenPayload,
    config.JWT_SECRET,
    config.JWT_EXPIRES_IN
  );

  const refreshToken = createToken(
    tokenPayload,
    config.refreshTokenSecret,
    config.jwtRefreshTokenExpiresIn
  );

  return {
    accessToken,
    refreshToken,
    user: userObj,
  };
};

const LoginRefreshToken = async (token) => {
  let decodedToken;

  try {
    decodedToken = jwt.verify(token, config.refreshTokenSecret);

    if (!decodedToken || !decodedToken.email) {
      throw new Error("You are not authorized");
    }
  } catch (error) {
    throw new Error("Unauthorized");
  }

  const email = decodedToken.email;
  const userData = await User.findOne({ email });

  if (!userData) {
    throw new Error("User not found");
  }

  const JwtPayload = {
    userId: userData._id,
    userType: userData.userType,
    email: userData.email,
  };

  const accessToken = createToken(
    JwtPayload,
    config.JWT_SECRET,
    config.JWT_EXPIRES_IN
  );

  return { accessToken };
};

const forgotPassword = async (email) => {
  if (!email) throw new Error("Email is required");

  const isExistingUser = await User.findOne({ email });
  if (!isExistingUser) throw new Error("User not found");

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

  isExistingUser.resetPasswordOtp = hashedOtp;
  isExistingUser.resetPasswordOtpExpires = otpExpires;
  await isExistingUser.save();

  await sendEmail({
    to: email,
    subject: `${companyName} - Password Reset OTP`,
    html: verificationCodeTemplate(otp),
  });

  const JwtToken = {
    userId: isExistingUser._id,
    email: isExistingUser.email,
    userType: isExistingUser.userType,
  };

  const accessToken = createToken(
    JwtToken,
    config.JWT_SECRET,
    config.JWT_EXPIRES_IN
  );

  return { accessToken };
};

const verifyToken = async (otp, email) => {
  if (!otp) throw new Error("OTP are required");

  const isExistingUser = await User.findOne({ email });
  if (!isExistingUser) throw new Error("User not found");

  if (
    !isExistingUser.resetPasswordOtp ||
    !isExistingUser.resetPasswordOtpExpires
  ) {
    throw new Error("Password reset OTP not requested or has expired");
  }

  if (isExistingUser.resetPasswordOtpExpires < new Date()) {
    throw new Error("Password reset OTP has expired");
  }

  const isOtpMatched = await bcrypt.compare(
    otp.toString(),
    isExistingUser.resetPasswordOtp
  );
  if (!isOtpMatched) throw new Error("Invalid OTP ");

  isExistingUser.resetPasswordOtp = undefined;
  isExistingUser.resetPasswordOtpExpires = undefined;
  await isExistingUser.save();

  const JwtToken = {
    userId: isExistingUser._id,
    email: isExistingUser.email,
    userType: isExistingUser.userType,
  };

  const accessToken = createToken(
    JwtToken,
    config.JWT_SECRET,
    config.JWT_EXPIRES_IN
  );

  return { accessToken };
};

const resetPassword = async (payload, email) => {
  if (!payload.newPassword) {
    throw new Error("Email and new password are required");
  }

  const isExistingUser = await User.findOne({ email });
  if (!isExistingUser) throw new Error("User not found");

  const hashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcryptSaltRounds)
  );

  const result = await User.findOneAndUpdate(
    { email },
    {
      password: hashedPassword,
      otp: undefined,
      otpExpires: undefined,
    },
    { new: true }
  ).select(
    "-password -otp -otpExpires -resetPasswordOtp -resetPasswordOtpExpires"
  );

  return result;
};

const changePassword = async (payload, email) => {
  const { currentPassword, newPassword } = payload;
  if (!currentPassword || !newPassword) {
    throw new Error("Current and new passwords are required");
  }

  const isExistingUser = await User.findOne({ email });
  if (!isExistingUser) throw new Error("User not found");

  const isPasswordMatched = await bcrypt.compare(
    currentPassword,
    isExistingUser.password
  );
  if (!isPasswordMatched) throw new Error("Invalid current password");

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcryptSaltRounds)
  );

  const result = await User.findOneAndUpdate(
    { email },
    {
      password: hashedPassword,
    },
    { new: true }
  ).select(
    "-password -otp -otpExpires -resetPasswordOtp -resetPasswordOtpExpires"
  );
  return result;
};



const authService = {
  loginUser,
  LoginRefreshToken,
  forgotPassword,
  verifyToken,
  resetPassword,
  changePassword,
};

module.exports = authService;
