const BusinessModel = require("../business/business.model");
const message = require("../message/message.model");
const User = require("../user/user.model");
const Chat = require("./chat.model");

const createChat = async (payload) => {
  const user = await User.findById(payload.userId);
  if (!user) throw new Error("User not found");

  const bussiness = await BusinessModel.findById(payload.bussinessId);
  if (!bussiness) throw new Error("Business not found");

  // const messages = await message.findById(payload.lastMessage);
  // if (!messages) throw new Error("Message not found");

  const result = await Chat.create({
    userId: user._id,
    bussinessId: bussiness._id,
  });

  const populatedResult = await Chat.findById(result._id)
    .populate({
      path: "userId",
      select: "name email imageLink",
    })
    .populate({
      path: "bussinessId",
      select: "businessInfo",
    });

  return populatedResult;
};

const getChat = async () => {
  const result = await Chat.find({})
    .populate({
      path: "userId",
      select: "name email imageLink",
    })
    .populate({
      path: "bussinessId",
      select: "businessInfo",
    })
    .populate("lastMessage ");

  return result;
};

const getMyChat = async (userId) => {
  // console.log("userId", userId);

  // Make sure we have a valid user
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  console.log("user", user);

  // Find chats for this user
  const result = await Chat.find({ userId: user._id })
    .populate({
      path: "userId",
      select: "name email imageLink",
    })
    .populate({
      path: "lastMessage",
    })
    .populate({
      path: "bussinessId",
      select: "businessInfo user",
    });

  // if no chats found
  if (!result || result.length === 0) {
    throw new Error("No chats found for this user.");
  }

  return result;
};

const getChatForBusinessMan = async (businessId) => {
  const business = await BusinessModel.findById(businessId);
  if (!business) throw new Error("Business not found");

  const result = await Chat.find({ bussinessId: business._id })
    .populate({
      path: "userId",
      select: "name email imageLink",
    })
    .populate({
      path: "lastMessage",
    })
    .populate({
      path: "bussinessId",
      select: "businessInfo user",
    });

  return result;
};

const chatService = {
  createChat,
  getChat,
  getMyChat,
  getChatForBusinessMan,
};

module.exports = chatService;
