const { Schema, model } = require("mongoose");

const chatSchema = new Schema(
  {
    participants: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        role: {
          type: String,
          enum: ["user", "businessMan", "admin"],
          required: true,
        },
      },
    ],
    businessId: { type: Schema.Types.ObjectId, ref: "Business" },
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message", default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const Chat = model("Chat", chatSchema);
module.exports = Chat;
