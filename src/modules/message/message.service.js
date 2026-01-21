const { sendImageToCloudinary } = require("../../utils/cloudnary");
const Chat = require("../chat/chat.model");
const Message = require("./message.model");
const fs = require("fs");

const sendMessage = async (payload, files) => {
  const { chatId, senderId, receiverId, message } = payload;

  let imageUrls = [];

  if (files?.length > 0) {
    for (const file of files) {
      const uploaded = await sendImageToCloudinary(file.path, "messages");
      fs.unlinkSync(file.path);
      imageUrls.push(uploaded.secure_url);
    }
  }

  const newMsg = await Message.create({
    chat: chatId,
    senderId,
    receiverId,
    message,
    images: imageUrls,
  });

  await Chat.findByIdAndUpdate(chatId, { lastMessage: newMsg._id });

  return newMsg;
};

const getMessages = async (chatId) => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw new Error("Chat not found");

  const messages = await Message.find({ chat: chatId }).sort({ createdAt: 1 });

  return messages;
};

const messageService = {
  sendMessage,
  getMessages,
};

module.exports = messageService;
