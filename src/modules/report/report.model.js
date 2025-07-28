const { Schema, model } = require("mongoose");

const reportSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reportMessage: {
      type: String,
      required: true,
    },
    isReport: {
      type: Boolean,
      enum: [true, false],
      default: false,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Report = model("Report", reportSchema);
module.exports = Report;
