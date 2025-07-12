const express = require ("express");
const auth = require("../../middleware/auth");
const USER_ROLE = require("../user/user.constant");
const { uploadPicture } = require("./picture.controller");
const { upload } = require("../../utils/cloudnary");
const router = express.Router();

router.post("/upload-image", auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user),upload.array("image", 5), uploadPicture);

const pictureRouter = router;
module.exports= pictureRouter;