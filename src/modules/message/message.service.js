const { sendImageToCloudinary } = require("../../utils/cloudnary");
const Chat = require("../chat/chat.model");
const Message = require("./message.model");
const fs = require("fs");

const sendMessage = async (payload, files) => {
  const { chatId, senderId, receiverId, message } = payload;

  // 1️⃣ Chat exist check
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new Error("Chat not found");
  }

  // 2️⃣ Sender validation
  const senderValid = chat.participants.some(
    (p) => p.userId.toString() === senderId,
  );

  // 3️⃣ Receiver validation
  const receiverValid = chat.participants.some(
    (p) => p.userId.toString() === receiverId,
  );

  if (!senderValid || !receiverValid) {
    throw new Error("Invalid sender or receiver");
  }

  // 4️⃣ Image upload
  let imageUrls = [];
  if (files?.length > 0) {
    for (const file of files) {
      const uploaded = await sendImageToCloudinary(file.path, "messages");
      fs.unlinkSync(file.path);
      imageUrls.push(uploaded.secure_url);
    }
  }

  // 5️⃣ Create message
  const newMsg = await Message.create({
    chat: chatId,
    senderId,
    receiverId,
    message,
    images: imageUrls,
  });

  // 6️⃣ Update last message
  await Chat.findByIdAndUpdate(chatId, {
    lastMessage: newMsg._id,
  });

  return newMsg;
};

const getMessages = async (chatId, businessId) => {
    const chat = await Chat.findOne({
      _id: chatId,
      businessId: businessId, // 🔑 only specific business
    });
  if (!chat) throw new Error("Chat not found");

  const messages = await Message.find({ chat: chatId }).sort({ createdAt: 1 });

  return messages;
};

const messageService = {
  sendMessage,
  getMessages,
};

module.exports = messageService;
