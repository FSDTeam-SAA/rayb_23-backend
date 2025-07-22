const { Schema, Types, model } = require("mongoose");

const pricingSchema = new Schema(
  {
    serviceName: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const instrumentNameSchema = new Schema(
  {
    name: { type: String, required: true },
    services: [pricingSchema],
  },
  { _id: false }
);

const serviceSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true },
    businessId: { type: Types.ObjectId, ref: "Business", required: true },
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
    // instrumentType: { type: String },
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
  },
  {
    timestamps: true,
  }
);

const ServiceOffered = model("ServiceOffered", serviceSchema);
module.exports = ServiceOffered;
