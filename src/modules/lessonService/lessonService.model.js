const mongoose = require("mongoose");

const lessonServiceSchema = new mongoose.Schema({
    
    isMusicLesson: { type: Boolean, default: false },
    lessons: [{
      instrument: String,
      type: {
        type: String,
      },
      priceType: {
        type: String,
        enum: ['Exact', 'Range', 'Hourly']
      },
      rangePrice: {
        min: Number,
        max: Number
      },
      exactPrice: {
        type: Number
      },
      hourlyPrice: {
        type: Number
      }
    }]
  }

, {
  timestamps: true,
});
const LessonService = mongoose.model('LessonService', lessonServiceSchema);
module.exports = LessonService;