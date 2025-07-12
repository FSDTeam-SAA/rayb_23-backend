const mongoose = require("mongoose");

const pictureSchema = new mongoose.Schema({
    image: [String],
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Business",
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, {
    timestamps: true
});

const PictureModel = mongoose.model("Picture", pictureSchema);

module.exports = PictureModel;
