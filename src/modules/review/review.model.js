const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    rating: { type: Number, min: 1, max: 5, required: true },
    feedback: { type: String, required: true },
    image: [String],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    report: {
      isReported: { type: Boolean, default: false },
      reportMessage: { type: String, default: "" },
    },
    reply: { type: String },
    googlePlaceId: { type: String, default: null },
  },
  { timestamps: true },
);

const ReviewModel = mongoose.model("Review", reviewSchema);
module.exports = ReviewModel;
