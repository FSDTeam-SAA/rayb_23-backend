const { default: mongoose } = require("mongoose");
const User = require("../user/user.model");
const Chat = require("./chat.model");


const isValidChat = (participants) => {
  if (!participants || participants.length !== 2) return false;

  const roles = participants.map((p) => p.role).sort();

  // user <-> businessMan
  if (roles[0] === "businessMan" && roles[1] === "user") return true;

  // businessMan <-> admin
  if (roles[0] === "admin" && roles[1] === "businessMan") return true;

  return false;
};

const createChat = async (participants, businessId) => {
  // 1️⃣ Validate combination
  if (!isValidChat(participants)) {
    throw new Error("This chat combination is not allowed");
  }

  // 2️⃣ Convert userIds to ObjectId
  const userIds = participants.map(
    (p) => new mongoose.Types.ObjectId(p.userId),
  );

  // 3️⃣ Check if chat already exists for same participants + businessId
  let chat = await Chat.findOne({
    "participants.userId": { $all: userIds }, // both participants
    businessId: businessId ? businessId : null, // match specific business
    $expr: { $eq: [{ $size: "$participants" }, 2] }, // exactly 2 participants
  });

  // 4️⃣ If not exists, create new chat
  if (!chat) {
    chat = await Chat.create({ participants, businessId });
  }

  return chat;
};


const getChat = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const chats = await Chat.find({
    "participants.userId": user._id,
  })
    .populate("participants.userId", "_id name role imageLink email")
    .populate("businessId", "businessInfo")
    .populate("lastMessage")
    .sort({ updatedAt: -1 })
    .lean(); // important

  // 🔥 Remove current user from participants
  const updatedChats = chats.map((chat) => {
    chat.participants = chat.participants.filter(
      (p) => p.userId._id.toString() !== userId,
    );
    return chat;
  });

  return updatedChats;
};


const chatService = {
  createChat,
  getChat,
};

module.exports = chatService;
