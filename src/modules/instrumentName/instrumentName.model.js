const mongoose = require("mongoose");

const instrumentNameSchema = new mongoose.Schema({
  instrumentName: {
    type: String,
    required: true
  },
  instrumentFamily: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InstrumentFamily"
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

const InstrumentNameModel = mongoose.model("InstrumentName", instrumentNameSchema);
module.exports = InstrumentNameModel;
