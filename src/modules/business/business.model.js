const { Schema, model } = require("mongoose");

// For business hours
const businessHoursSchema = new Schema(
  {
    day: {
      type: String,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
    },
    open: { type: String },
    close: { type: String },
    closed: { type: Boolean, default: false },
  },
  { _id: false }
);

// For service details
const serviceSchema = new Schema(
  {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ["Repair", "Lesson", "Other"],
      required: true,
    },
    pricingType: {
      type: String,
      enum: ["Exact", "Range", "Hourly"],
      required: true,
    },
    price: { type: Schema.Types.Mixed, required: true },
    instrumentType: { type: String }, // Guitar, Ukulele etc.
    instrumentFamily: {
      type: String,
      enum: [
        "Strings",
        "Woodwinds",
        "Brass",
        "Percussions",
        "Keyboard",
        "Others",
      ],
    },
  },
  { _id: false }
);

const musicLessonSchema = new Schema(
  {
    instrumentFamily: {
      type: String,
      enum: [
        "Strings",
        "Brass",
        "Woodwinds",
        "Percussions",
        "Keyboard",
        "Others",
      ],
      required: true,
    },
    instrumentType: { type: String, required: true },
    pricing: { type: Number },
  },
  { _id: false }
);

// Full Business schema
const businessSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
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

  services: [serviceSchema],
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
  isMusiclessons: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  isMailVerified: {
    type: Boolean,
    default: false,
  },
});

const Business = model("Business", businessSchema);
module.exports = Business;
