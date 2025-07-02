const mongoose = require("mongoose");

const savedBusinessSchema = new mongoose.Schema({
    savedBusiness: {
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
    timestamps: true,
});

const SavedBusinessModel = mongoose.model("SavedBusiness", savedBusinessSchema);
module.exports = SavedBusinessModel;
