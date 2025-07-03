const mongoose = require ('mongoose');

const serviceNameSchema = new mongoose.Schema({
  ServiceName:{
    type:String,
    require :true
  },
 }, {
    timestamps: true
    });

const ServiceNameModel = mongoose.model('ServiceName', serviceNameSchema);
module.exports = ServiceNameModel;