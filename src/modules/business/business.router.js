const express = require("express");
const { createBusiness, getAllBusinesses, getBusinessById } = require("./business.controller");
const { upload } = require("../../utils/cloudnary");
const router = express.Router();
const USER_ROLE = require("../user/user.constant");
const auth = require("../../middleware/auth");


// Create new business
router.post("/create",upload.array("image", 5),auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user), createBusiness);
// Get all businesses
router.get("/all", getAllBusinesses);
// Get business by ID
router.get("/:id", auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user),getBusinessById);

const businessRouter = router;
module.exports = businessRouter;