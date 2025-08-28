const InstrumentFamilyModel = require("./instrumentFamily.model");

const createInstrument = async (payload) => {
  const result = await InstrumentFamilyModel.create(payload);
  return result;
};

const getAllInstrument = async ({ id, name }) => {

  if (id) {
    // Find the parent document that contains this nested type
    const instrumentFamily = await InstrumentFamilyModel.findOne({
      "instrumentTypes._id": id
    }).lean().exec();

    if (!instrumentFamily) return null;

    // Convert _id to string for comparison
    const typeObj = instrumentFamily.instrumentTypes.find(
      t => t._id.toString() === id
    );

    return typeObj; 
  }
  
  if (name) {
    const instrumentFamily = await InstrumentFamilyModel.findOne({
      "instrumentTypes.type": name
    }).lean().exec();

    if (!instrumentFamily) return null;

    const typeObj = instrumentFamily.instrumentTypes.find(
      t => t.type === name
    );

    return typeObj; 
  }

  const allInstruments = await InstrumentFamilyModel.find({}).lean().exec();
  return allInstruments;
};


const getInstrumentById = async (id) => {
  return await InstrumentFamilyModel.findById(id);
};

const updateInstrumentName = async (instrumentId, payload) => {
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



// Update Instrument Service
const updateInstrument = async (instrumentId, typeId, payload) => {

  const instrument = await InstrumentFamilyModel.findById(instrumentId);
  if (!instrument) {
    throw new Error("Instrument family not found");
  }

  let updateQuery = {};

  if (payload.replace) {
   
    updateQuery = {
      $set: {
        "instrumentTypes.$.serviceType": payload.serviceType,
      },
    };
  } else {
    
    updateQuery = {
      $addToSet: {
        "instrumentTypes.$.serviceType": { $each: payload.serviceType },
      },
    };
  }

  const result = await InstrumentFamilyModel.findOneAndUpdate(
    { _id: instrumentId, "instrumentTypes._id": typeId },
    updateQuery,
    { new: true }
  );

  if (!result) {
    throw new Error("Instrument type not found");
  }

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
  getInstrumentById,
  updateInstrument,
  updateInstrumentName,
  deleteInstrument,
};

module.exports = instrumentService;
