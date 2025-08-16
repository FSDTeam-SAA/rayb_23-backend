const express = require("express");
const auth = require("../../middleware/auth");
const USER_ROLE = require("../user/user.constant");
const { getNotifications, markAsRead, deleteNotification, makeIgnore, getAllNotifications } = require("./notification.controller");

const router = express.Router();



router.get(
  "/",
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  getNotifications
);
router.get(
  "/",
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  getAllNotifications
);

router.put(
  "/read/:id",
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  markAsRead
);
router.put(
  "/ignore/:id",
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  makeIgnore
);

router.delete(
  "/:id",
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  deleteNotification
);

const notificationRouter = router;
module.exports = notificationRouter;
