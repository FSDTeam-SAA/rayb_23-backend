const mongoose = require ('mongoose');

const instrumentFamilySchema = new mongoose.Schema({
  instrumentFamily: [String], 
  status: {
    type: String,
    enum: ['active', 'inactive'],
  },
 }, {
    timestamps: true
    });

const InstrumentFamilyModel = mongoose.model('InstrumentFamily', instrumentFamilySchema);
module.exports = InstrumentFamilyModel;