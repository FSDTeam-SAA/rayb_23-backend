const { Schema, model } = require("mongoose");

const messageSchema = new Schema(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
    },
    message: {
      type: String,
      default: "",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    images: [{ type: String }],
    date: {
      type: Date,
      default: Date.now,
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const Message = model("Message", messageSchema);
module.exports = Message;
