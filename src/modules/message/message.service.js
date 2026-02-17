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

const getMessages = async (chatId, businessId, currentUserId) => {
  // 1️⃣ Find chat by ID
  const chat = await Chat.findById(chatId).lean();
  if (!chat) throw new Error("Chat not found");

  // 2️⃣ Check if currentUser is a participant
  const participant = chat.participants.find(
    (p) => p.userId.toString() === currentUserId,
  );
  if (!participant) throw new Error("You are not part of this chat");

  // 3️⃣ Business-specific filter for businessMan
  if (participant.role === "businessMan") {
    if (!businessId || chat.businessId.toString() !== businessId) {
      throw new Error("Chat not found for this business");
    }
  }

  // 4️⃣ Fetch messages
  const messages = await Message.find({ chat: chatId })
    .sort({ createdAt: 1 })
    .lean();

  return messages;
}; 


const getSenderMessages = async (chatId, userId) => {
  const chat = await Chat.findOne({
    _id: chatId,
  });
  if (!chat) throw new Error("Chat not found");

  const messages = await Message.find({
    chat: chatId,
    $or: [{ senderId: userId }, { receiverId: userId }],
  }).sort({ createdAt: 1 });

  return messages;
};

const messageService = {
  sendMessage,
  getMessages,
  getSenderMessages,
};

module.exports = messageService;
