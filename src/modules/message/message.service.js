const { io } = require("../../app");
const { sendImageToCloudinary } = require("../../utils/cloudnary");
const Chat = require("../chat/chat.model");
const User = require("../user/user.model");
const message = require("./message.model");

const sendMessage = async (payload, file, io) => {
  const { senderId, receiverId, chat } = payload;

  // console.log("senderId:", senderId);
  // console.log("receiverId:", receiverId);

  // Validate sender
  const senderUser = await User.findById(senderId);
  if (!senderUser) throw new Error("Sender not found");

  // Validate receiver
  const receiverUser = await User.findById(receiverId);
  if (!receiverUser) throw new Error("Receiver not found");

  // Upload image if provided
  if (file) {
    const imageName = `${Date.now()}-${file.originalname}`;
    const path = file.path;
    const { secure_url } = await sendImageToCloudinary(imageName, path);
    payload.image = secure_url;
  }

  // Create message
  const newMessage = await message.create({
    ...payload,
    senderId,
    receiverId,
    date: new Date(),
    chat,
  });

  // Notify all clients in this chat room
  io.to(chat.toString()).emit("message", newMessage);

  // Update lastMessage in chat
  await Chat.findByIdAndUpdate(chat, { lastMessage: newMessage._id });

  return newMessage;
};

const getMessages = async (chatId) => {
  const chat = await Chat.findById(chatId);
  if (!chat) throw new Error("Chat not found");

  const messages = await message.find({ chat: chatId }).populate({
    path: "senderId",
    select: "name email",
  });
  return messages.sort((a, b) => {
    return a.date - b.date;
  });
};

const getResiverMessage = async (resiverId) => {
  const user = await User.findById(resiverId);
  if (!user) throw new Error("User not found");

  const messages = await message.find({ receiverId: user._id }).populate({
    path: "senderId",
    select: "name email",
  });
  return messages;
};

const getSenderMessage = async (senderId) => {
  const user = await User.findById(senderId);
  if (!user) throw new Error("User not found");

  const messages = await message.find({ senderId: user._id }).populate({
    path: "receiverId",
    select: "name email",
  });
  return messages;
};

const messageService = {
  sendMessage,
  getMessages,
  getResiverMessage,
  getSenderMessage,
};

module.exports = messageService;
