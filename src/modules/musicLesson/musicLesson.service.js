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

const getMyMusicLessons = async (email) => {
  const user = await User.findOne({ email: email });
  if (!user) throw new Error("User not found");

  const business = await Business.findOne({ user: user._id });
  if (!business) throw new Error("Business not found for the user");

  const musicLessons = await MusicLesson.find({ businessId: business._id })
    .populate("userId", "name email")
    .populate("businessId", "businessInfo.name");

  return musicLessons;
};

const addPricingMusicLesson = async (email, payload, musiclessonId) => {
  const { instrumentName, pricing } = payload;

  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  const business = await Business.findOne({ user: user._id });
  if (!business) throw new Error("Business not found for the user");

  // Use musiclessonId to update the correct document
  const musicLesson = await MusicLesson.findOneAndUpdate(
    {
      _id: musiclessonId,
      businessId: business._id,
      "instrumentType.name": instrumentName,
    },
    {
      $set: {
        "instrumentType.$[elem].pricing": pricing,
      },
    },
    {
      arrayFilters: [{ "elem.name": instrumentName }],
      new: true,
    }
  );

  if (!musicLesson) throw new Error("Music lesson or instrument not found");

  return musicLesson;
};

const musicLessonsService = {
  createMusicLessonInDb,
  getMyMusicLessons,
  addPricingMusicLesson,
};
module.exports = musicLessonsService;
