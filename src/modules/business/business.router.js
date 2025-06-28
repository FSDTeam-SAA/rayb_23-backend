const express = require("express");
const { createBusiness, getAllBusinesses } = require("./business.controller");
const { upload } = require("../../utils/cloudnary");
const router = express.Router();
const USER_ROLE = require("../user/user.constant");
const auth = require("../../middleware/auth");


// Create new business
router.post("/create",upload.array("image", 5), createBusiness);
// Get all businesses
router.get("/all", getAllBusinesses)

const businessRouter = router;
module.exports = businessRouter;