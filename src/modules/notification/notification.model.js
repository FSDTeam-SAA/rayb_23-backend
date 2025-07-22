const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    role: {
      type: String,
      enum: ["admin", "businessMan", "user"],
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "business_review",
        "message",
        "photo_upload",
        "business_approved",
        "business_rejected",
        "review_reply",
        "claim_approved",
        "other"
      ],
    },
    title: String,
    message: String,
    isRead: { type: Boolean, default: false },
    metadata: { type: Object }, // Optional for more info like businessId, reviewId, etc.
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);
module.exports= Notification;
