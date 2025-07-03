const { sendImageToCloudinary } = require("../../utils/cloudnary");
const User = require("../user/user.model");
const message = require("./message.model");

const sendMessage = async (payload, email, file) => {
  const senderUser = await User.findOne({ email });
  if (!senderUser) throw new Error("sender not found");

  //TODO: i thing there some logic will add there for user.

  const resiverUser = await User.findById(payload.receiverId);
  if (!resiverUser) throw new Error("Receiver not found");

  if (file) {
    const imageName = `${Date.now()}-${file.originalname}`;
    const path = file?.path;
    const { secure_url } = await sendImageToCloudinary(imageName, path);
    payload.image = secure_url;
  }

  const newMessage = await message.create({
    ...payload,
    senderId: senderUser._id,
    receiverId: resiverUser._id,
    date: new Date(),
  });
  return newMessage;
};

const getMessages = async () => {
  const messages = await message.find({});
  return messages;
};

const getResiverMessage = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  const messages = await message.find({ receiverId: user._id }).populate({
    path: "senderId",
    select: "name email",
  });
  return messages;
};

const getSenderMessage = async (email) => {
  const user = await User.findOne({ email });
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
