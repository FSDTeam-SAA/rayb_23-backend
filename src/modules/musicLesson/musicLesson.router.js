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

router.get(
  "/my-music-lessons",
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  musicLessonsController.getMyMusicLessons
);

router.patch(
  "/add-pricing/:musiclessonId",
  auth(USER_ROLE.admin, USER_ROLE.businessMan, USER_ROLE.user),
  musicLessonsController.addPricingMusicLesson
);

const musicLesson = router;
module.exports = musicLesson;
