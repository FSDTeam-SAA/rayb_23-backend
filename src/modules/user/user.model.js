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
      enum: ["user", "bussinessMan"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deactivedStartDate: {
      type: Date,
      default: null,
    },
    deactivedEndDate: {
      type: Date,
      default: null,
    },
    deactivedReason: {
      type: String,
      default: null,
    },
    isDeactived: {
      // it's change able because after dective in 30 days user also login. when user deactive his account then i will update that isDeactived to true. When user login again in 30 days then i will update that isDeactived to false and set deactivedStartDate and deactivedEndDate to null. After 30 days then i will update isActive to false. [isActive is permanent field].
      type: Boolean,
      default: false,
    },
    address: {
      type: String,
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
