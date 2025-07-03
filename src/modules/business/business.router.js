const express = require("express");
const { createBusiness, getAllBusinesses, getBusinessById, updateBusiness, getBusinessesByUser, deleteBusiness, getAllBusinessesAdmin } = require("./business.controller");
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

//get all business

// router.get("/get-all", )


// Get all approve businesses
router.get("/all", getAllBusinesses);
// router.get("/", getAllBusinesses);

//get by user
router.get(
  "/my-add-business",
  auth(USER_ROLE.admin, USER_ROLE.user, USER_ROLE.bussinessMan, USER_ROLE.ad),
  getBusinessesByUser
);
// Get business by ID
router.get(
  "/:id",
  auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user),
  getBusinessById
);

// update business by user
router.put(
  "/my-add-business/:id",
  auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user),
  upload.array("image", 5),
  updateBusiness
);

//delete business by user
router.delete(
  "/delete-business/:id",
  auth(USER_ROLE.admin, USER_ROLE.user, USER_ROLE.bussiness),
  deleteBusiness
);

const businessRouter = router;
module.exports = businessRouter;
