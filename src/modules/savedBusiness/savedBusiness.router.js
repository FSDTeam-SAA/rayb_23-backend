const express = require("express");
const { createSavedBusiness, getSavedBusinessesByUser, getSavedBusinessById } = require("./savedBusiness.controller");
const auth = require("../../middleware/auth");
const USER_ROLE = require("../user/user.constant");
const router = express.Router();

router.post("/create",auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user), createSavedBusiness);
// get saved business by user
router.get("/my-saved-business", auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user), getSavedBusinessesByUser);

//get saved business by id
router.get("/:id", auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user), getSavedBusinessById);


const savedBusinessRouter = router;
module.exports = savedBusinessRouter;