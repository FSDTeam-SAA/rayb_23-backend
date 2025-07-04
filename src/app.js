const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const globalErrorHandler = require("./middleware/globalErrorHandler");
const notFound = require("./middleware/notFound");
const router = require("./router");
const {Server} = require("socket.io");

const http = require("http");
const server = http.createServer(app);
const io = new Server(server,{
  cors: {
    origin: "*",
    credentials: true,
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const corsOptions = {
  origin: "*",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(cookieParser());


io.on("connection", (socket) => {

  console.log("a user connected");

  socket.on("joinChat", (chatId) => {
    socket.join(chatId.toString());
    console.log("user connected with chatId", chatId);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

app.use("/api/v1", router);

app.use("/", (req, res) => {
  return res.send("Your server is running!");
});

app.use(globalErrorHandler);
app.use(notFound);

module.exports = {app,server,io};
