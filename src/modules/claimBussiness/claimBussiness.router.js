const { Router } = require("express");
const { upload } = require("../../utils/cloudnary");
const auth = require("../../middleware/auth");
const USER_ROLE = require("../user/user.constant");
const claimBussinessController = require("./claimBussiness.controller");

const router = Router();

router.put(
  "/:claimBusinessId",
  upload.array("document", 5),
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
  claimBussinessController.documentVerification
);

router.get(
  "/",
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  claimBussinessController.getAllClaimBussiness
);

router.get(
  "/my-bussiness",
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  claimBussinessController.getMyClaimBussiness
);

router.get(
  "/claim/:claimBusinessId",
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  claimBussinessController.claimBusinessById
);

router.put(
  "/claim/:claimBusinessId",
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  claimBussinessController.toggleClaimBussinessStatus
);

router.post(
  "/send-otp/:businessId",
  // auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  claimBussinessController.sendOtp
);

router.post(
  "/verify-email/:businessId",
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  claimBussinessController.bussinessEmailVerify
);

const claimBussinessRouter = router;
module.exports = claimBussinessRouter;
