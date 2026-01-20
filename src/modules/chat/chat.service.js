const User = require("../user/user.model");
const Chat = require("./chat.model");

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
  getChat,
};

module.exports = chatService;
