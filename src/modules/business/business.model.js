const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
  {
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

    instrumentInfo: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Instrument" },
    ],
    lessonServicePrice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LessonService",
    },
    userEmail: { type: String },

    businessHours: [
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
        isOpen: { type: Boolean, default: false },
        openTime: { type: String },
        closeTime: { type: String },
      },
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    userEmail: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const BusinessModel = mongoose.model("Business", businessSchema);
module.exports = BusinessModel;
