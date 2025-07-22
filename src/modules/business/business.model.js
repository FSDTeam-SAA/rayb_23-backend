const { Schema, model } = require("mongoose");

const businessHoursSchema = new Schema(
  {
    day: {
      type: String,
      enum: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
    },
    open: { type: String },
    close: { type: String },
    closed: { type: Boolean, default: false },
  },
  { _id: false }
);

const musicLessonSchema = new Schema(
  {
    instrumentFamily: {
      type: String,
      enum: [
        "strings",
        "brass",
        "woodwinds",
        "percussions",
        "keyboard",
        "others",
      ],
      required: true,
    },
    instrumentType: { type: String, required: true },
    pricing: { type: Number },
  },
  { _id: false }
);

const businessSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    adminId: { type: Schema.Types.ObjectId, ref: "User" },
    businessInfo: {
      name: { type: String, required: true },
      image: [
        {
          type: String,
          required: true,
        },
      ],
      address: { type: String, required: true },
      phone: { type: String },
      email: { type: String },
      website: { type: String },
      description: { type: String, required: true },
    },
    services: [
      {
        type: Schema.Types.ObjectId,
        ref: "ServiceOffered",
      },
    ],
    musicLessons: [musicLessonSchema],
    businessHours: [businessHoursSchema],

    buyInstruments: { type: Boolean, default: false },
    sellInstruments: { type: Boolean, default: false },
    offerMusicLessons: { type: Boolean, default: false },
    review: [
      {
        type: Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
    reviewImage: [
      {
        type: Schema.Types.ObjectId,
        ref: "Picture",
      },
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    isMusiclessons: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },
    isMailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Business = model("Business", businessSchema);
module.exports = Business;
