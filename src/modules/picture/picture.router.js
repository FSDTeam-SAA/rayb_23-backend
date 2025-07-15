const express = require ("express");
const auth = require("../../middleware/auth");
const USER_ROLE = require("../user/user.constant");
const { uploadPicture, getAllPicturesAdmin, getAllPicturesByUser, getPictureById, updatePictureById, deletedPicture, getPictureByBusinessId } = require("./picture.controller");
const { upload } = require("../../utils/cloudnary");
const router = express.Router();

router.post("/upload-image", auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user),upload.array("image", 5), uploadPicture)
router.get("/get-all-pictures", auth(USER_ROLE.admin, USER_ROLE.user, USER_ROLE.bussinessMan), getAllPicturesAdmin);
router.get("/get-all-pictures-by-user", auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user), getAllPicturesByUser);
router.get("/get-all-pictures-by-business/:id", auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user), getPictureByBusinessId);
router.get("/get-picture/:id", auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user), getPictureById);
router.put("/update-picture/:id", auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user), upload.array("image", 5), updatePictureById);
router.delete("/delete-picture/:id", auth(USER_ROLE.admin, USER_ROLE.bussinessMan, USER_ROLE.user), deletedPicture);

const pictureRouter = router;
module.exports= pictureRouter;