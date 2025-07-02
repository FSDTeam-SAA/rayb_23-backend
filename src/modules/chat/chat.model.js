const { Schema, model } = require("mongoose");

const chatSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  bussinessId: {
    type: Schema.Types.ObjectId,
    ref: "Business",
  },
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: "Message",
  },
});

const Chat = model("Chat", chatSchema);
module.exports = Chat;
