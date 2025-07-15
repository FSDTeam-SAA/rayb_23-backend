const express = require ("express");
const { getAllNotification } = require("./notification.controller");
const auth = require("../../middleware/auth");
const USER_ROLE = require("../user/user.constant");
const router = express.Router();

router.get("/all-notify",auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user), getAllNotification)