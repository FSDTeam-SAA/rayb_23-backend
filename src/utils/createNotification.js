const NotifyModel = require("../modules/notification/notification.model")
const createNotification = async ( userId, message,type) => {
    const newNotification = new NotifyModel({
        user: userId,
        text: message,
        type: type,
    });
    await newNotification.save();
    return newNotification;
}

module.exports = createNotification;