const express = require("express");
const {
  createBusiness,
  getAllBusinesses,
  getBusinessesByUser,
  getDashboardData,
  getMyApprovedBusinesses,
  getBusinessmanDashboardData,
  getAllBusinessesByAdmin,
} = require("./business.controller");
const { upload } = require("../../utils/cloudnary");
const router = express.Router();
const USER_ROLE = require("../user/user.constant");
const auth = require("../../middleware/auth");

// Create new business
router.post(
  "/create",
  upload.array("image", 5),
  (req, res, next) => {
    if (req.body?.data) {
      try {
        req.body = JSON.parse(req.body.data);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON format in 'data' field",
        });
      }
    }
    next();
  },
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  createBusiness
);

router.get("/", getAllBusinesses);

// router.get("/all", getAllBusinessesAdmin);

router.get(
  "/my-add-business",
  auth(USER_ROLE.admin, USER_ROLE.user, USER_ROLE.businessMan, USER_ROLE.ad),
  getBusinessesByUser
);

router.get(
  "/dashboard",
  // auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  getDashboardData
);

router.get(
  "/my-approved-business",
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  getMyApprovedBusinesses
);

router.get(
   "/my-Dashboard", auth(USER_ROLE.businessMan),
   getBusinessmanDashboardData
)

router.get(
  "/:businessId",
  // auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  getAllBusinessesByAdmin
);




// router.put(
//   "/my-add-business/:id",
//   auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
//   upload.array("image", 5),
//   updateBusiness
// );


const businessRouter = router;
module.exports = businessRouter;
