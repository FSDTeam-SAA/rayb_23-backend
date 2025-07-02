const mongoose = require ('mongoose');

const instrumentFamilySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['active', 'inactive'],
  },
 }, {
    timestamps: true
    });

const InstrumentFamilyModel = mongoose.model('InstrumentFamily', instrumentFamilySchema);
module.exports = InstrumentFamilyModel;