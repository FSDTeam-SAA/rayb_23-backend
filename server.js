const { mongoose } = require("mongoose");
const { app, server } = require("./src/app");
const config = require("./src/config");
const { initSocket } = require("./src/socket");
const { Server } = require("socket.io");
const http = require("http");

async function main() {
  try {
    await mongoose.connect(config.MONGODB_URI, {
      maxPoolSize: 50, // 🔥 Increase connection pool (default is 5)
      minPoolSize: 10, // optional but recommended
      serverSelectionTimeoutMS: 30000, // ⏱️ Wait 30s before failing
      socketTimeoutMS: 45000, // ⏱️ Close idle sockets after 45s
      connectTimeoutMS: 30000, // ⏱️ Connection timeout
      heartbeatFrequencyMS: 10000,
    });
    console.log("Database connected.....");

    const server = http.createServer(app);

    // Socket.io attach
    const io = new Server(server, {
      cors: { origin: "*", methods: ["GET", "POST"] },
    });

    initSocket(io);

    server.listen(config.PORT, () => {
      console.log(`Server running on port http://localhost:${config.PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
}

main();
