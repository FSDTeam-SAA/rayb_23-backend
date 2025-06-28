const mongoose = require("mongoose");
const { instrumentSchema } = require("../instrument/instrument.model");
const { lessonServiceSchema } = require("../lessonService/lessonService.model");

const businessSchema = new mongoose.Schema({
    businessInfo: {
        businessName: { type: String, required: true },
        businessPhoto: [{
            type: String,
            required: true
        }],
        businessAddress: { type: String, required: true },
        businessPhone: { type: String },
        businessEmail: { type: String },
        businessWebsite: { type: String },
        businessDescription: { type: String, required: true }
    },

    instrumentInfo: [instrumentSchema],

    lessonServicePrice: lessonServiceSchema,

    businessHours: [{
        day: {
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        },
        isOpen: { type: Boolean, default: false },
        openTime: { type: String },
        closeTime: { type: String }
    }]
}, {
    timestamps: true
});

const BusinessModel = mongoose.model("Business", businessSchema);
module.exports = BusinessModel;
