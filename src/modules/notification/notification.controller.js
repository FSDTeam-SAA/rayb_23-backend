const Notification = require("./notification.model");
const User = require("../user/user.model");

// exports.createNotification = async (req, res) => {
//   try {
//     const { receiverId, userType, type, title, message, metadata } = req.body;
//     const senderId = req.user.userId;

//     const notify = await Notification.create({
//       senderId,
//       receiverId,
//       userType,
//       type,
//       title,
//       message,
//       metadata,
//     });

//     return res.status(201).json({
//       status: true,
//       message: "Notification created.",
//       notify,
//     });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ status: false, message: "Error", error: error.message });
//   }
// };

exports.getNotifications = async (req, res) => {
  try {
    const { userId, userType } = req.user;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }
    let notify;
    if (userType === "admin") {
      notify = await Notification.find({ isIgnored: false }).sort({
        createdAt: -1,
      });
    } else {
      notify = await Notification.find({
        receiverId: userId,
        isIgnored: false,
      }).sort({ createdAt: -1 });
    }

    return res.status(200).json({
      status: true,
      message: "Notifications fetched",
      notify,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Error", error: error.message });
  }
};

exports.getAllNotifications = async (req, res) => {
  try {
    const { userId, userType } = req.user;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }
    let notify;
    if (userType === "admin") {
      notify = await Notification.find().sort({ createdAt: -1 });
    } else {
      notify = await Notification.find({ receiverId: userId }).sort({
        createdAt: -1,
      });
    }

    return res.status(200).json({
      status: true,
      message: "Notifications fetched",
      notify,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Error", error: error.message });
  }
};

exports.makeIgnore = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Notification.findByIdAndUpdate(
      id,
      { isIgnored: true },
      { new: true }
    );

    return res.status(200).json({
      status: true,
      message: "Notification ignored",
      updated,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Error", error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    return res.status(200).json({
      status: true,
      message: "Marked as read",
      updated,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Error", error: error.message });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    await Notification.findByIdAndDelete(id);

    return res.status(200).json({
      status: true,
      message: "Notification deleted",
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Error", error: error.message });
  }
};
