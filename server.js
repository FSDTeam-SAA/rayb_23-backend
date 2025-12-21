const { mongoose } = require("mongoose");
const { app, server } = require("./src/app");
const config = require("./src/config");
const { Server } = require("socket.io");
const http = require("http");
const {
  initNotificationSocket,
} = require("./src/modules/socket/notification.service");

async function main() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log("Database connected.....");

    const httpServer = http.createServer(app);

    // Attach Socket.IO to that HTTP server
    const io = new Server(httpServer, {
      cors: {
        origin: "*", // or your frontend URL
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);
      socket.on("joinRoom", (userId) => socket.join(userId));
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
