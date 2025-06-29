const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
  {
    businessInfo: {
      name: { type: String, required: true },
      image: [
        {
          type: String,
          required: true,
        },
      ],
      address: { type: String, required: true },
      phone: { type: String },
      email: { type: String },
      website: { type: String },
      description: { type: String, required: true },
    },


    businessHours: [
      {
        day: {
          type: String,
          enum: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ],
        },
        isOpen: { type: Boolean, default: false },
        openTime: { type: String },

const BusinessModel = mongoose.model("Business", businessSchema);
module.exports = BusinessModel;
