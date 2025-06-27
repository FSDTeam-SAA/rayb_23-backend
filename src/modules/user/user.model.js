const { Schema, model } = require("mongoose");
const config = require("../../config");
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
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
      unique: [true, "Phone number must be unique"],
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
    role: {
      type: String,
      enum: ["company_admin", "admin"],
      default: "company_admin",
    },
    shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
    },
    isShopCreated: {
      type: Boolean,
      default: false,
    },
    employeeCount: {
      type: Number,
      default: 0,
    }
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
