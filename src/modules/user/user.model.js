const { Schema, model } = require("mongoose");
const bcrypt = require("bcrypt");

const userModel = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    email: {
      type: String,
      required: true,
      unique: [true, "Email is required"],
    },
    bio: { type: String, default: null },
    password: {
      type: String,
      required: [true, "Password is required"],
      min: [8, "Password must be at least 8 characters"],
    },
    phone: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    imageLink: { type: String, default: null },
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },
    resetPasswordOtp: { type: String, default: null },
    resetPasswordOtpExpires: { type: Date, default: null },
    userType: {
      type: String,
      enum: ["user", "businessMan", "admin"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deactivateStartDate: {
      type: Date,
      default: null,
    },
    deactivateEndDate: {
      type: Date,
      default: null,
    },
    deactivateReason: {
      type: String,
      default: null,
    },
    isDeactivate: {
      type: Boolean,
      default: false,
    },
    address: {
      type: String,
      default: null,
    },
    toFactorAuth: {
      type: Boolean,
      default: false,
    },
    support: {
      type: String,
      default: null,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

userModel.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userModel.post("save", function (doc, next) {
  doc.password = "";
  next();
});

const User = model("User", userModel);
module.exports = User;
