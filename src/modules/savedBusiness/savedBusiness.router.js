const express = require("express");
const { createSavedBusiness } = require("./savedBusiness.controller");
const auth = require("../../middleware/auth");
const USER_ROLE = require("../user/user.constant");
const router = express.Router();

router.post("/create",auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user), createSavedBusiness);

const savedBusinessRouter = router;
module.exports = savedBusinessRouter;