const mongoose = require("mongoose");

const lessonServiceSchema = new mongoose.Schema({
  isMusicLesson: { type: Boolean, default: false },
  lessons: [{
    instrument: String,
    type: {
      type: String
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
  }],
   user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  userEmail: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = {
  LessonService: mongoose.model('LessonService', lessonServiceSchema),
  lessonServiceSchema
};
