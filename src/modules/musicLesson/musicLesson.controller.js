const musicLessonsService = require("./musicLesson.service");

const createMusicLesson = async (req, res) => {
  try {
    const { email } = req.user;
    const result = await musicLessonsService.createMusicLessonInDb(
      req.body,
      email
    );

    return res.status(201).json({
      success: true,
      message: "Music lesson created successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      error: error,
    });
  }
};

const getMyMusicLessons = async (req, res) => {
  try {
    const { email } = req.user;
    const result = await musicLessonsService.getMyMusicLessons(email);

    return res.status(200).json({
      success: true,
      message: "Music lessons retrieved successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      error: error,
    });
  }
};

const addPricingMusicLesson = async (req, res) => {
  try {
    const { email } = req.user;
    const { musiclessonId } = req.params;
    const result = await musicLessonsService.addPricingMusicLesson(
      email,
      req.body,
      musiclessonId
    );

    return res.status(200).json({
      success: true,
      message: "Pricing added successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      error: error,
    });
  }
};

const musicLessonsController = {
  createMusicLesson,
  getMyMusicLessons,
  addPricingMusicLesson,
};
module.exports = musicLessonsController;
