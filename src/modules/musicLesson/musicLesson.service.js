const Business = require("../business/business.model");
const User = require("../user/user.model");
const MusicLesson = require("./musicLesson.model");

const createMusicLessonInDb = async (payload, email) => {
  const user = await User.findOne({ email: email });
  if (!user) throw new Error("User not found");

  const business = await Business.findOne({ user: user._id });
  if (!business) throw new Error("Business not found for the user");

  const result = await MusicLesson.create({
    ...payload,
    userId: user._id,
    businessId: business._id,
  });

  return result;
};

const musicLessonsService = {
  createMusicLessonInDb,
};
module.exports = musicLessonsService;
