const express = require ("express");
const auth = require("../../middleware/auth");
const USER_ROLE = require("../user/user.constant");
const { uploadPicture } = require("./picture.controller");
const router = express.Router();

router.post("/upload-image", auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user), uploadPicture);

const pictureRouter = router;
module.exports= pictureRouter;