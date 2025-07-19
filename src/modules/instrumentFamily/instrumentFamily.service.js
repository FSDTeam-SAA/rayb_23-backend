const InstrumentFamilyModel = require("./instrumentFamily.model");

const createInstrument = async (payload) => {
  const result = await InstrumentFamilyModel.create(payload);
  return result;
};

const getAllInstrument = async () => {
  const result = await InstrumentFamilyModel.find({}).lean().exec();
  return result;
};

const instrumentService = {
  createInstrument,
  getAllInstrument,
};

module.exports = instrumentService;
