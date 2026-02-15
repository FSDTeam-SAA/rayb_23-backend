const { default: mongoose } = require("mongoose");
const { sendImageToCloudinary } = require("../../utils/cloudnary");
const sendEmail = require("../../utils/sendEmail");
const verificationCodeTemplate = require("../../utils/verificationCodeTemplate");
const BusinessModel = require("../business/business.model");
const User = require("../user/user.model");
const ClaimBussiness = require("./claimBussiness.model");
const bcrypt = require("bcrypt");
const Business = require("../business/business.model");
const Notification = require("../notification/notification.model");

const documentVerification = async (payload, email, files, businessId) => {
  // Find the user
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");
  if (!user.isActive) throw new Error("User is not active");

  // Check if claim exists for this user + business
  const claimBusiness = await ClaimBussiness.findOne({
    businessId: new mongoose.Types.ObjectId(businessId),
    userId: user._id,
  });

  if (!claimBusiness) throw new Error("Claim business not found");

  // Upload documents if any
  let uploadedDocuments = [];
  if (files && Array.isArray(files) && files.length > 0) {
    uploadedDocuments = await Promise.all(
      files.map(async (file) => {
        const imageName = `business/${Date.now()}_${file.originalname}`;
        const result = await sendImageToCloudinary(imageName, file.path);
        return result.secure_url;
      }),
    );
  }

  // Update the claim with new data
  const filter = {
    businessId: new mongoose.Types.ObjectId(businessId),
    userId: user._id,
  };

  const update = {
    ...payload,
    documents: uploadedDocuments,
  };

  const options = { new: true, upsert: true };

  const result = await ClaimBussiness.findOneAndUpdate(
    filter,
    { $set: update },
    options,
  ).populate("userId", "name email number");

  return result;
};

const getAllClaimBussiness = async ({ claimType, time, sortBy }) => {
  const filter = {};

  if (claimType && ["pending", "approved", "rejected"].includes(claimType)) {
    filter.status = claimType;
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
  }

  if (sortBy === "status") {
    const result = await ClaimBussiness.aggregate([
      { $match: filter },
      {
        $addFields: {
          statusOrder: {
            $switch: {
              branches: [
                { case: { $eq: ["$status", "pending"] }, then: 1 },
                { case: { $eq: ["$status", "approved"] }, then: 2 },
                { case: { $eq: ["$status", "rejected"] }, then: 3 },
              ],
              default: 4,
            },
          },
        },
      },
      { $sort: { statusOrder: 1, createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "businesses",
          localField: "businessId",
          foreignField: "_id",
          as: "business",
        },
      },
      { $unwind: "$business" },
      {
        $project: {
          user: { name: 1, email: 1, number: 1 },
          businessId: "$business._id",
          business: {
            name: "$business.businessInfo.name",
            address: "$business.businessInfo.address",
            phone: "$business.businessInfo.phone",
          },
          status: 1,
          createdAt: 1,
        },
      },
    ]);

    return result;
  }

  if (sortBy === "A-Z") {
    const result = await ClaimBussiness.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "businesses",
          localField: "businessId",
          foreignField: "_id",
          as: "business",
        },
      },
      { $unwind: "$business" },
      {
        $addFields: {
          businessName: "$business.businessInfo.name",
        },
      },
      { $sort: { businessName: 1 } },
      {
        $project: {
          user: { name: 1, email: 1, number: 1 },
          businessId: "$business._id",
          business: {
            name: "$businessName",
            address: "$business.businessInfo.address",
            phone: "$business.businessInfo.phone",
          },

          status: 1,
          createdAt: 1,
        },
      },
    ]);

    return result;
  }

  const docs = await ClaimBussiness.find(filter)
    .populate({
      path: "userId",
      select: "name email number",
    })
    .populate({
      path: "businessId",
      select: "businessInfo",
    })
    .sort(sortQuery)
    .lean();

  const result = docs.map((doc) => ({
    _id: doc._id,
    user: doc.userId,
    businessId: doc.businessId?._id,
    business: {
      name: doc.businessId?.businessInfo?.name,
      address: doc.businessId?.businessInfo?.address,
      phone: doc.businessId?.businessInfo?.phone,
    },
    documents: doc.documents,
    status: doc.status,
    createdAt: doc.createdAt,
  }));

  return result;
};

const getMyClaimBussiness = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  if (!user.isActive) throw new Error("User is not active");

  const result = await ClaimBussiness.find({
    userId: user._id,
    status: "approved",
  })
    .populate({ path: "userId", select: "name email" })
    .populate({ path: "businessId" });

  return result;
};

const getClaimBusinessById = async (id) => {
  const result = await ClaimBussiness.findById(id).populate({
    path: "userId",
    select: "name email",
  });
  return result;
};

const toggleClaimBussinessStatus = async (claimBusinessId, payload) => {
  const { status } = payload;

  const allowedStatuses = ["pending", "approved", "rejected"];
  if (!allowedStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const businessClaim = await ClaimBussiness.findById(claimBusinessId);
  if (!businessClaim) throw new Error("Claim business not found");

  const business = await Business.findById(businessClaim.businessId);
  if (!business) throw new Error("Business not found");

  const user = await User.findById(businessClaim.userId);
  if (!user) throw new Error("User not found");

  const result = await ClaimBussiness.findByIdAndUpdate(
    { _id: claimBusinessId },
    { $set: { status } },
    { new: true },
  )
    .populate("userId", "name email number")
    .populate("businessId", "businessInfo");

  await User.findByIdAndUpdate(
    user._id,
    { $set: { userType: "businessMan" } },
    { new: true },
  );

  await Business.findByIdAndUpdate(
    business._id,
    { $set: { isClaimed: true } },
    { new: true },
  );

  // ---------- Notification Logic ----------
  if (user) {
    // Duplicate check
    const alreadyNotified = await Notification.findOne({
      receiverId: user._id,
      type: `claim_business_${status}`, // claim_business_approved / rejected
      "metadata.claimBusinessId": claimBusinessId,
    });

    if (!alreadyNotified) {
      await Notification.create({
        senderId: null, // system/admin
        receiverId: user._id,
        userType: "user",
        type: `claim_business_${status}`,
        title:
          status === "approved"
            ? "Business Claim Approved"
            : "Business Claim Rejected",
        message:
          status === "approved"
            ? `Your claim for business ${business.businessInfo?.name || "Business"} has been approved.`
            : `Your claim for business ${business.businessInfo?.name || "Business"} has been rejected.`,
        metadata: {
          claimBusinessId,
          status,
          businessId: business._id,
        },
      });
    }
  }

  return result;
};

const sendOtp = async (payload, businessId) => {
  const { email } = payload;

  if (!email) {
    throw new Error("Email is required");
  }

  const business = await BusinessModel.findById(businessId);
  if (!business) {
    throw new Error("Business not found");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

  await BusinessModel.findByIdAndUpdate(
    businessId,
    {
      otp: hashedOtp,
      otpExpires,
    },
    { new: true },
  );

  const emailResult = await sendEmail({
    to: email,
    subject: "Verify your email",
    html: verificationCodeTemplate(otp),
  });

  // 🔴 VERY IMPORTANT
  if (!emailResult.success) {
    throw new Error("Failed to send OTP email");
  }

  return true;
};

const bussinessEmailVerify = async (userEmail, businessId, payload) => {
  const { otp } = payload;

  const bussiness = await BusinessModel.findById(businessId);
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
  bussiness.isMailVerified = true;
  await bussiness.save();

  const newClaim = await ClaimBussiness.create({
    businessId: bussiness._id,
    userId: user._id,
    status: "pending",
    isVerified: false,
    otp: null,
    otpExpires: null,
  });

  return newClaim;
};

const claimBussinessService = {
  documentVerification,
  getAllClaimBussiness,
  getClaimBusinessById,
  getMyClaimBussiness,
  toggleClaimBussinessStatus,
  sendOtp,
  bussinessEmailVerify,
};

module.exports = claimBussinessService;
