const mongoose = require ('mongoose');

const instrumentNameSchema = new mongoose.Schema({
  instrumentFamily:{
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

const InstrumentNameModel = mongoose.model('InstrumentFamily', instrumentNameSchema);
module.exports = InstrumentNameModel;