const express = require("express");
const {
  createReview,
  getReviewsByAdmin,
  getMyReviews,
  updateReview,
  deleteReview,
  toggleReview,
  reportReview,
} = require("./review.controller");
const { upload } = require("../../utils/cloudnary");
const auth = require("../../middleware/auth");
const USER_ROLE = require("../user/user.constant");
const router = express.Router();

router.post(
  "/create",
  upload.array("image", 5), // 🔹 Accept up to 5 images with field name "image"
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  createReview
);

router.get("/", auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user), getReviewsByAdmin);

router.get(
  "/my-review",
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  getMyReviews
);

router.put(
  "/edit/:id",
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  updateReview
);

router.put(
  "/toggle/:id",
  auth(USER_ROLE.admin),
  toggleReview
);
router.put(
  "/report/:id",
  auth(USER_ROLE.admin, USER_ROLE.businessMan),
  reportReview
);

router.delete("/delete-Review/:id", auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user), deleteReview);

const reviewRouter = router;
module.exports = reviewRouter;
