const Notification = require("../notification/notification.model");


let io = null;

// initialize socket
const initNotificationSocket = (socketIO) => {
  console.log("🔥 initNotificationSocket called");
  io = socketIO;
};

const createNotification = async ({
  senderId = null,
  receiverId,
  userType,
  type,
  title,
  message,
  metadata = {},
}) => {

  // const exists = await Notification.findOne({
  //   receiverId,
  //   type,
  //   "metadata.businessId": metadata.businessId || null,
  // });

  // if (exists) return exists;

  const notification = await Notification.create({
    senderId,
    receiverId,
    userType,
    type,
    title,
    message,
    metadata,
  });

  // Emit live notification
  if (io) {
    io.to(receiverId.toString()).emit("new_notification", notification);
  }

  return notification;
};

module.exports = {
  initNotificationSocket,
  createNotification,
};
