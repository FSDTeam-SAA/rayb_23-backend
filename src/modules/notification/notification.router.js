const express = require("express");
const auth = require("../../middleware/auth");
const USER_ROLE = require("../user/user.constant");
const { createNotificationAdmin } = require("../../utils/createNotification");
const { getNotifications, markAsRead, deleteNotification } = require("./notification.controller");

const router = express.Router();



router.get(
  "/",
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  getNotifications
);

router.put(
  "/read/:id",
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  markAsRead
);

router.delete(
  "/:id",
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  deleteNotification
);

const notificationRouter = router;
module.exports = notificationRouter;
