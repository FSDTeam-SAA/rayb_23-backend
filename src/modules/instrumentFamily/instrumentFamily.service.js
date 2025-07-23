const InstrumentFamilyModel = require("./instrumentFamily.model");

const createInstrument = async (payload) => {
  const result = await InstrumentFamilyModel.create(payload);
  return result;
};

const getAllInstrument = async () => {
  const result = await InstrumentFamilyModel.find({}).lean().exec();
  return result;
};

const updateInstrument = async (instrumentId, payload) => {
  const instrument = await InstrumentFamilyModel.findById(instrumentId);
  if (!instrument) {
    throw new Error("Instrument not found");
  }

  const result = await InstrumentFamilyModel.findByIdAndUpdate(
    instrumentId,
    payload,
    { new: true }
  );
  return result;
};

const deleteInstrument = async (instrumentId) => {
  const instrument = await InstrumentFamilyModel.findById(instrumentId);
  if (!instrument) {
    throw new Error("Instrument not found");
  }

  const result = await InstrumentFamilyModel.findByIdAndDelete(instrumentId);
  return result;
};

const instrumentService = {
  createInstrument,
  getAllInstrument,
  updateInstrument,
  deleteInstrument,
};

module.exports = instrumentService;
