const { mongoose } = require("mongoose");
const { app, server } = require("./src/app");
const config = require("./src/config");
const { Server } = require("socket.io");
// const http = require("http");
const {
  initNotificationSocket,
} = require("./src/modules/socket/notification.service");

async function main() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log("Database connected.....");

    // const httpServer = http.createServer(app);

    // Attach Socket.IO to that HTTP server
    const io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("✅ socket connected:", socket.id);

      socket.on("joinRoom", (userId) => {
        console.log("👤 joined room:", userId, "socket:", socket.id);
        socket.join(userId);
      });
    });

    initNotificationSocket(io);

    server.listen(config.PORT, () => {
      console.log(`Server running on port http://localhost:${config.PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
}

main();
