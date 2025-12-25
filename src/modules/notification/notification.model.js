const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userType: {
      type: String,
      enum: ["admin", "businessMan", "user"],
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    title: String,
    message: String,
    isRead: { type: Boolean, default: false },
    isIgnored: {
      type: Boolean,
      default: false,
    },
    metadata: { type: Object }, // Optional for more info like businessId, reviewId, etc.
  },
  { timestamps: true }
);


// notificationSchema.index(
//   { receiverId: 1, type: 1, "metadata.businessId": 1 },
//   { unique: true }
// );

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
