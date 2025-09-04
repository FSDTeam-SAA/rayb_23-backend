const config = require("../../config");
const { sendImageToCloudinary } = require("../../utils/cloudnary");
const sendEmail = require("../../utils/sendEmail");
const { createToken } = require("../../utils/tokenGenerate");
const verificationCodeTemplate = require("../../utils/verificationCodeTemplate");
const Business = require("../business/business.model");
const User = require("./user.model");
const bcrypt = require("bcrypt");

const createNewAccountInDB = async (payload) => {
  const existingUser = await User.findOne({ email: payload.email });
  if (existingUser) {
    throw new Error("User already exists");
  }

  if (payload.password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
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
    userType: result.userType,
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
      userType: result.userType,
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

  const isOtpMatched = await bcrypt.compare(otp.toString(), existingUser.otp);
  if (!isOtpMatched) throw new Error("Invalid OTP");

  const result = await User.findOneAndUpdate(
    { email },
    {
      isVerified: true,
      $unset: { otp: "", otpExpires: "" },
    },
    { new: true }
  ).select(
    "-password -otp -otpExpires -resetPasswordOtp -resetPasswordOtpExpires"
  );

  const response = {
    success: true,
    message: "Email verified successfully",
    data: result,
  };

  // ⏬ Add token only if 2FA is enabled
  if (result.toFactorAuth) {
    const JwtToken = {
      userId: result._id,
      email: result.email,
      userType: result.userType,
    };

    const accessToken = createToken(
      JwtToken,
      config.JWT_SECRET,
      config.JWT_EXPIRES_IN
    );

    response.accessToken = accessToken;
  }

  return response;
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
  ).select("name email userType");

  await sendEmail({
    to: existingUser.email,
    subject: "Verify your email",
    html: verificationCodeTemplate(otp),
  });
  return result;
};

const getAllUsersFromDb = async ({ userType, sortBy, time }) => {
  const filter = {};

  if (userType && ["user", "businessOwner", "businessMan"].includes(userType)) {
    filter.userType = userType;
  }

  if (sortBy === "deactivated") {
    filter.isActive = false;
  }

  if (time && ["last-7", "last-30"].includes(time)) {
    const now = new Date();
    const pastDate = new Date();

    if (time === "last-7") {
      pastDate.setDate(now.getDate() - 7);
    } else if (time === "last-30") {
      pastDate.setDate(now.getDate() - 30);
    }
    filter.createdAt = { $gte: pastDate };
  }

  let sortQuery = { createdAt: -1 };

  if (sortBy === "latest") {
    sortQuery = { createdAt: -1 };
  } else if (sortBy === "oldest") {
    sortQuery = { createdAt: 1 };
  } else if (sortBy === "name") {
    sortQuery = { name: 1 };
  }

  const users = await User.find(filter)
    .select("-password -otp -otpExpires")
    .sort(sortQuery);

  return users;
};

const getMyProfileFromDb = async ({ email }) => {
  const user = await User.findOne({ email })
    .select("name email userType imageLink bio address phone")
    .populate({
      path: "businessId",
      select: "businessInfo",
    });
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

const deactiveAccount = async (email, payload) => {
  const session = await User.startSession();

  try {
    session.startTransaction();

    const isExistingUser = await User.findOne({ email }).session(session);
    if (!isExistingUser) throw new Error("User not found");

    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    // const endDate = new Date(now.getTime() + 2 * 60 * 1000);

    await User.findByIdAndUpdate(
      isExistingUser._id,
      {
        $set: {
          isDeactivate: true,
          deactivateStartDate: now,
          deactivateEndDate: endDate,
          deactivateReason: payload.deactivateReason || null,
        },
      },
      { new: true, session }
    );

    await session.commitTransaction();
    session.endSession();
    
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const deletedUserAccount = async (userId) => {
  const user = await User.findById(userId).select("-password -otp -otpExpires");
  if (!user) throw new Error("User not found");

  const result = await User.findByIdAndUpdate(
    userId,
    {
      isActive: false,
    },
    { new: true }
  ).select("-password -otp -otpExpires");
  return result;
};

const addSupport = async (payload) => {
  const { email, support } = payload;
  if (!email || !support)
    throw new Error("Email and support message are required");

  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  const updatedUser = await User.findByIdAndUpdate(
    {
      _id: user._id,
    },
    {
      $set: { support },
    },
    {
      new: true,
    }
  ).select("name email support");

  return updatedUser;
};

const getSingleUser = async (userId) => {
  const user = await User.findById(userId).select(
    "-password -otp -otpExpires -resetPasswordOtp -resetPasswordOtpExpires -__v"
  );
  if (!user) throw new Error("User not found");

  return user;
};

const toggleUserStatus = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const result = await User.findByIdAndUpdate(
    userId,
    {
      $set: { isActive: !user.isActive },
    },
    { new: true }
  );

  return result;
};

const userService = {
  createNewAccountInDB,
  verifyUserEmail,
  resendOtpCode,
  getAllUsersFromDb,
  getMyProfileFromDb,
  updateUserProfile,
  deactiveAccount,
  deletedUserAccount,
  addSupport,
  getSingleUser,
  toggleUserStatus,
};

module.exports = userService;
