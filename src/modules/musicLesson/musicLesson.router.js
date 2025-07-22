const { Router } = require("express");
const auth = require("../../middleware/auth");
const USER_ROLE = require("../user/user.constant");
const musicLessonsController = require("./musicLesson.controller");

const router = Router();

router.post(
  "/create-lesson",
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  musicLessonsController.createMusicLesson
);

const musicLesson = router;
module.exports = musicLesson;
