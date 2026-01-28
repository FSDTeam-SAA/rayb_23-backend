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
      // required: [true, "Password is required"],
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
    isActive: {  // isActive false means user permanently deleted
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
    isDeactivate: {  // isDeactivate false means user can login in 30 days
      type: Boolean,
      default: false,
    },
    isDelete: {  // isDelete true means it's deleted by admin like permanently deleted.
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
    type: {
      type: String,
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
