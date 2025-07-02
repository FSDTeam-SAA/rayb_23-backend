const { Schema, model } = require("mongoose");

const messageSchema = new Schema({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  message: {
    type: String,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  image: {
    type: String,
    default: null,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  chat: {
    type: Schema.Types.ObjectId,
    ref: "Chat",
  },
});

const message = model("Message", messageSchema);
module.exports = message;
