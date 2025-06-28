const express = require("express");
const { createBusiness } = require("./business.controller");
const { upload } = require("../../utils/cloudnary");
const router = express.Router();


// Create new business
router.post("/create",upload.array("images", 5), createBusiness);

const businessRouter = router;
module.exports = businessRouter;