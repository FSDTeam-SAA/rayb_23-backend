const { mongoose } = require("mongoose");
const { app, server } = require("./src/app");
const config = require("./src/config");
const { initSocket } = require("./src/socket");
const { Server } = require("socket.io");
const http = require("http");

async function main() {
  try {
    await mongoose.connect(config.MONGODB_URI);
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
