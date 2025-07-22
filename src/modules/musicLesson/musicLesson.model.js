const { Schema, Types, model } = require("mongoose");

const musicLessonSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
    },
    businessId: {
      type: Types.ObjectId,
      ref: "Business",
    },
    instrumentFamily: {
      type: String,
      enum: [
        "strings",
        "brass",
        "woodwinds",
        "percussions",
        "keyboard",
        "others",
      ],
      required: true,
    },
    instrumentType: [
      {
        name: { type: String, required: true },
        pricing: { type: Number, default: null },
      },
      { _id: false },
    ],
  },
  {
    timestamps: true,
  }
);

const MusicLesson = model("MusicLesson", musicLessonSchema);

module.exports = MusicLesson;
