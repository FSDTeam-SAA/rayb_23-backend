const express = require("express");
const { createBusiness, getAllBusinesses, getBusinessById, updateBusiness, getBusinessesByUser } = require("./business.controller");
const { upload } = require("../../utils/cloudnary");
const router = express.Router();
const USER_ROLE = require("../user/user.constant");
const auth = require("../../middleware/auth");
const { verifyToken } = require("../auth/auth.service");


// Create new business
router.post(
  "/create",
  upload.array("image", 5), // 🔹 Accept up to 5 images with field name "image"

  auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user),


  createBusiness
);
// Get all businesses
router.get("/all", getAllBusinesses);
// Get business by ID
router.get("/:id", auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user),getBusinessById);

//get by user
router.get("/my-add-business", auth(USER_ROLE.admin, USER_ROLE.bussinessMan), getBusinessesByUser)

// Update business by ID
router.put("/:id",auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user), updateBusiness);

const businessRouter = router;
module.exports = businessRouter;