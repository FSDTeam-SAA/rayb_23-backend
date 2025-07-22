// const User = require("../modules/user/user.model");

// const sendNotiFication = async (io ,req, saveNotification, saveNotificationAdmin) => {
    
//     const { userId: userID } = req.user;

//     // Send to user
//     const userNotification = io.to(userID.toString()).emit("new-notification", { saveNotification });

//     // Send to admin(s)
//     const admins = await User.find({ isVerified: true, userType: "admin" }).select("_id");
//     const adminNotification = admins.forEach(admin => {
//         io.to(admin._id.toString()).emit("new-notification", { saveNotificationAdmin });
//     });

//     return { userNotification, adminNotification };
// }

// module.exports = sendNotiFication;