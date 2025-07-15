const mongoose = require("mongoose");

const instrumentAndServiceSchema = new mongoose.Schema({
  instrumentFamily: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InstrumentFamily",
    required: true,
  },
  instrumentName: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "InstrumentName",
    required: true,
  }],
  serviceName: [{
    type: String,
    required: true,
  }],
}, {
  timestamps: true    
});

const InstrumentAndService = mongoose.model("InstrumentAndService", instrumentAndServiceSchema);
module.exports = InstrumentAndService;
