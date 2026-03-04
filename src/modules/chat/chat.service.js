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

// const createChat = async (participants, businessId) => {
//   // 1️⃣ Validate combination
//   if (!isValidChat(participants)) {
//     throw new Error("This chat combination is not allowed");
//   }

//   // 2️⃣ Convert userIds to ObjectId
//   const userIds = participants.map(
//     (p) => new mongoose.Types.ObjectId(p.userId),
//   );

//   // 3️⃣ Check if chat already exists for same participants + businessId
//   let chat = await Chat.findOne({
//     "participants.userId": { $all: userIds }, // both participants
//     businessId: businessId ? businessId : null, // match specific business
//     $expr: { $eq: [{ $size: "$participants" }, 2] }, // exactly 2 participants
//   });

//   // 4️⃣ If not exists, create new chat
//   if (!chat) {
//     chat = await Chat.create({ participants, businessId });
//   }

//   return chat;
// };

const createChat = async (participants, businessId) => {
  // 1️⃣ Validate role combination
  if (!isValidChat(participants)) {
    throw new Error("This chat combination is not allowed");
  }

  // 2️⃣ Convert IDs to ObjectId
  const formattedParticipants = participants.map((p) => ({
    userId: new mongoose.Types.ObjectId(p.userId),
    role: p.role,
  }));

  const businessObjectId = businessId
    ? new mongoose.Types.ObjectId(businessId)
    : null;

  // 3️⃣ Create deterministic chatKey
  const sortedIds = formattedParticipants
    .map((p) => p.userId.toString())
    .sort();

  const chatKey =
    sortedIds.join("_") + "_" + (businessObjectId?.toString() || "null");

  try {
    // 4️⃣ Try to find existing chat
    let chat = await Chat.findOne({ chatKey });

    if (chat) return chat;

    // 5️⃣ Create new chat
    chat = await Chat.create({
      participants: formattedParticipants,
      businessId: businessObjectId,
      chatKey,
    });

    return chat;
  } catch (error) {
    // 6️⃣ Handle duplicate key (race condition case)
    if (error.code === 11000) {
      return await Chat.findOne({ chatKey });
    }
    throw error;
  }
};


const getChat = async (userId, businessId = null) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // 1️⃣ Build query
  const query = { "participants.userId": user._id };

  if (businessId) {
    query.businessId = businessId; // filter by business if provided
  }

  // 2️⃣ Find chats
  const chats = await Chat.find(query)
    .populate("participants.userId", "_id name role imageLink email")
    .populate("businessId", "businessInfo")
    .populate("lastMessage")
    .sort({ updatedAt: -1 })
    .lean();

  // 3️⃣ Remove current user from participants
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
