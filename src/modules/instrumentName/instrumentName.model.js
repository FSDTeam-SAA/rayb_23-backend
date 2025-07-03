const mongoose = require ('mongoose');

const instrumentNameSchema = new mongoose.Schema({
  instrumentName:{
    type:String,
    require :true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
  },
 }, {
    timestamps: true
    });

const InstrumentNameModel = mongoose.model('InstrumentName', instrumentNameSchema);
module.exports = InstrumentNameModel;