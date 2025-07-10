const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    rating: { type: Number, min: 1, max: 5, required: true },
    feedback: { type: String, required: true },
    image: [String], // image URLs

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    report: {
      isReport: {
        type: Boolean,
        enum: [true, false],
        default: false,
      },
      reportMessage: {
        type: String,
      },
    },
    replay: {
      type: String,
    },
    googlePlaceId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const ReviewModel = mongoose.model("Review", reviewSchema);

module.exports = ReviewModel;
