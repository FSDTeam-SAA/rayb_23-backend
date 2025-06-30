const express = require("express");
const { createSavedBusiness, getSavedBusinessesByUser } = require("./savedBusiness.controller");
const auth = require("../../middleware/auth");
const USER_ROLE = require("../user/user.constant");
const router = express.Router();

router.post("/create",auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user), createSavedBusiness)
// get saved business by user
router.get("/my-saved-business", auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user), getSavedBusinessesByUser)

const savedBusinessRouter = router;
module.exports = savedBusinessRouter;