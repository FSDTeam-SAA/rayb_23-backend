const { Schema, Types, model } = require("mongoose");

const pricingSchema = new Schema({
  serviceName: { type: String, required: true },
  price: { type: Number, required: true },
});

const instrumentNameSchema = new Schema({
  name: { type: String, required: true },
  services: [pricingSchema],
});

const serviceSchema = new Schema({
  userId: { type: Types.ObjectId, ref: "User" },
  businessId: { type: Types.ObjectId, ref: "Business" },
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ["repair", "lesson", "other"],
    required: true,
  },
  pricingType: {
    type: String,
    enum: ["exact", "range", "hourly"],
    required: true,
  },
  price: { type: Schema.Types.Mixed },

  instrumentType: { type: String },
  instrumentFamily: {
    type: String,
    enum: [
      "strings",
      "woodwinds",
      "brass",
      "percussions",
      "keyboard",
      "others",
    ],
  },

  instrumentName: [instrumentNameSchema],
});

const ServiceOffered = model("ServiceOffered", serviceSchema);

module.exports = ServiceOffered;
