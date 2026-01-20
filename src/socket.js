const Chat = require("./modules/chat/chat.model");
const Message = require("./modules/message/message.model");

function initSocket(io) {
  io.on("connection", (socket) => {
    console.log("A user connected");

    // Join chat room
    socket.on("joinChat", (chatId) => {
      socket.join(chatId);
      console.log("User joined chatId:", chatId);
    });

    // Join notification room
    socket.on("joinNotification", (userId) => {
      socket.join(userId);
      console.log("User joined notification room:", userId);
    });

    // Send message
    socket.on("sendMessage", async (data) => {
      const { chatId, senderId, receiverIds, message, images } = data;
      try {
        const newMessage = await Message.create({
          senderId,
          receiverIds,
          message,
          images,
          chat: chatId,
        });

        await Chat.findByIdAndUpdate(chatId, { lastMessage: newMessage._id });

        // Emit message to chat room
        io.to(chatId).emit("newMessage", newMessage);

        // Emit notification to each receiver
        receiverIds.forEach((rid) => {
          io.to(rid.toString()).emit("notification", {
            message: "You have a new message",
            chatId,
            senderId,
          });
        });
      } catch (err) {
        console.error("sendMessage error:", err.message);
      }
    });

    // Mark message as read
    socket.on("readMessage", async ({ messageId, userId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, {
          $addToSet: { isReadBy: userId },
        });
        io.to(messageId).emit("messageRead", { messageId, userId });
      } catch (err) {
        console.error("readMessage error:", err.message);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
}

module.exports = { initSocket };
