const NotifyModel = require("./notification.model");
const User = require("../user/user.model");


exports.getAllNotification = async (req, res) => {
  try {
    const { userId } = req.user;

    const isExist = await User.findById({ _id: userId });
    if (!isExist) {
      return res.status(400).json({
        status: false,
        message: "User not found.",
      });
    }

    const notify = await NotifyModel.find({ user: userId });
    if (!notify) {
      return res.status(404).json({
        status: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "notification fetched successfully.",
      notify,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "server error",
      error: error.message,
    });
  }
};

exports.getSingleNotification = async (req, res) => {
  try {
    const { id } = req.param;
    const notify = await NotifyModel.findById(id);
    if (!notify) {
      return res
        .status(404)
        .json({ success: false, message: "notification not found" });
    }
    res.status(200).json({
      success: true,
      message: "notification fetched successfully",
      notify,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "server error",
      error: error.message,
    });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.param;
    const notify = await NotifyModel.findByIdAndDelete(id);
    if (!notify) {
      return res.status(404).json({
        status: false,
        message: "Notification not found .",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "server error",
      error: error.message,
    });
  }
};

exports.read = async (req, res) => {
  try {
    const { userId} = req.user;
    const { id } = req.param;
    const isExist = await User.findById({ _id: userId });
    if (!isExist) {
      return res.status(400).json({
        status: false,
        message: "User not found.",
      });
    }

    const updatedNotify = await NotifyModel.findByIdAndUpdate(
      id,
      { read: true },
      {
        new: true,
      }
    );

    res.status(200).json({
      status: true,
      message: "Notification have  seen .",
      updatedNotify,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "server error",
      error: error.message,
    });
  }
};
