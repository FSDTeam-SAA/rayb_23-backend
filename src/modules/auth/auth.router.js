const { Router } = require("express");
const auth = require("../../middleware/auth");
const USER_ROLE = require("../user/user.constant");
const authController = require("./auth.controller");

const router = Router();

router.post("/login", authController.loginUser);
router.post("/refresh-token", authController.refreshToken);
router.post("/forgot-password", authController.forgotPassword);

router.post(
  "/verify-token",
  auth(USER_ROLE.bussinessMan, USER_ROLE.user, USER_ROLE.admin),
  authController.verifyToken
);

router.post(
  "/reset-password",
  auth(USER_ROLE.bussinessMan, USER_ROLE.user, USER_ROLE.admin),
  authController.resetPassword
);

router.post(
  "/change-password",
  auth(USER_ROLE.bussinessMan, USER_ROLE.user, USER_ROLE.admin),
  authController.changePassword
);


const authRouter = router;
module.exports = authRouter;
