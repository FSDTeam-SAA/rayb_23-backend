const mongoose = require("mongoose");

const ReviewSchema = new Schema({
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    feedback: {
        type: String,
        required: true
    },
    photos: [String],
},
    {
        timestamps: true,
    }
);

const ReviewModel = mongoose.model("Review", ReviewSchema);
module.exports = ReviewModel;