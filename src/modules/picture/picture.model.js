const mongoose = require("mongoose");

const PictureSchema = new mongoose.Schema({
    image: [
        {
            type: String,
            required: true,
        },
    ],
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Business",
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
},
{
    timestamps: true,
  }
)

const PictureModel = mongoose.model("Picture", PictureSchema);

module.export = PictureModel;