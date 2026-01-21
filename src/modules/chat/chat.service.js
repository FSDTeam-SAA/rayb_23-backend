const User = require("../user/user.model");
const Chat = require("./chat.model");

const createChat = async (participants) => {
  let chat = await Chat.findOne({ participants: { $all: participants } });
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
