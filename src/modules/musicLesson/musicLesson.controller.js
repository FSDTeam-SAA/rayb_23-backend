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

const musicLessonsController = {
  createMusicLesson,
};
module.exports = musicLessonsController;
