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

const createChat = async (participants) => {
  // ✅ Basic validation
  if (!isValidChat(participants)) {
    throw new Error("This chat combination is not allowed");
  }

  const userIds = participants.map(
    (p) => new mongoose.Types.ObjectId(p.userId),
  );

  // ✅ Prevent duplicate chat (ORDER SAFE)
  let chat = await Chat.findOne({
    "participants.userId": { $all: userIds },
    $expr: { $eq: [{ $size: "$participants" }, 2] },
  });

  if (!chat) {
    chat = await Chat.create({ participants });
  }

  return chat;
};

const getChat = async (userId) => {
  const user = await User.findById(userId).populate("chats");
  if (!user) throw new Error("User not found");

  const chats = await Chat.find({
    participants: { $in: [user._id] },
  })
    .populate("participants", "_id name role imageLink email")
    .populate("lastMessage")
    .sort({ updatedAt: -1 });

  return chats;
};

const chatService = {
  createChat,
  getChat,
};

module.exports = chatService;
