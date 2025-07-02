const mongoose = require ('mongoose');

const instrumentFamilySchema = new mongoose.Schema({
  instrumentFamily: {
    type: [String],
    required: true
  }, 
 }, {
    timestamps: true
    });

const InstrumentFamilyModel = mongoose.model('InstrumentFamily', instrumentFamilySchema);
module.exports = InstrumentFamilyModel;