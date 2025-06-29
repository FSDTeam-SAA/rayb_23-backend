const mongoose = require("mongoose");

const instrumentSchema = new mongoose.Schema({
  instrumentFamily: {
    type: String,
    enum: ['Strings', 'Woodwinds', 'Brass', 'Percussions'],
    required: true
  },
  instrumentsName: [{
    type: String,
    required: true
  }],
  servicesPrice: [{
    instrument: String,
    type: {
      type: String,
    },
    priceType: {
      type: String,
      enum: ['Exact', 'Range', 'Hourly']
    },
    rangePrice: {
      min: Number,
      max: Number
    },
    exactPrice: {
      type: Number
    },
    hourlyPrice: {
      type: Number
    }
  }],
  buySellTrade: {
    sellInstruments: { type: Boolean, default: false },
    buyInstruments: { type: Boolean, default: false },
    tradeInstruments: { type: Boolean, default: false }
  },
  
}, {
  timestamps: true
});

module.exports = {
  Instrument: mongoose.model('Instrument', instrumentSchema),
  instrumentSchema
};
