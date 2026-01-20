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
      const { chatId, senderId, receiverId, message, image } = data;

      try {
        const newMessage = await Message.create({
          senderId,
          receiverId,
          message,
          image,
          chat: chatId,
        });

        await Chat.findByIdAndUpdate(chatId, { lastMessage: newMessage._id });

        // Send message to chat room
        io.to(chatId).emit("newMessage", newMessage);

        // Send notification to receiver room
        io.to(receiverId.toString()).emit("notification", {
          chatId,
          senderId,
          message: "New message received",
        });
      } catch (err) {
        console.log("sendMessageErr:", err.message);
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
