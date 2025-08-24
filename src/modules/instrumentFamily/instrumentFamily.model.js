const mongoose = require("mongoose");

const instrumentTypeSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
  },
  serviceType: [
    {
      type: String,
      required: true,
    },
  ],
});

const instrumentFamilySchema = new mongoose.Schema(
  {
    instrumentFamily: {
      type: String,
      required: true,
    },
    instrumentTypes: [instrumentTypeSchema], // <-- এখানে object schema দিলাম
  },
  {
    timestamps: true,
  }
);

const InstrumentFamilyModel = mongoose.model(
  "InstrumentFamily",
  instrumentFamilySchema
);

module.exports = InstrumentFamilyModel;
