const InstrumentFamilyModel = require("./instrumentFamily.model");
const instrumentService = require("./instrumentFamily.service");

// const createInstrument = async (req, res) => {
//   try {
//     const result = await instrumentService.createInstrument(req.body);
//     const { instrumentFamily, instrumentTypes } = result

//     const existInstrumentFamily = await instrumentService.getInstrumentFamilyByName(instrumentFamily);
//     const existInstrumentTypes = await instrumentService.getInstrumentFamilyByName(instrumentTypes);
//     const existInstrumentService = await instrumentService.getInstrumentFamilyByName(instrumentTypes);
//     if (existInstrumentFamily || existInstrumentTypes || existInstrumentService) {
//       return res.status(400).json({
//         success: false,
//         code: 409,
//         message: "Already exist",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       code: 200,
//       message: "Instrument created successfully",
//       data: result,
//     });
//   } catch (error) {
//     return res.status(400).json({ success: false, message: error.message });
//   }
// };


const createInstrument = async (req, res) => {
  try {
    const { instrumentFamily, instrumentTypes } = req.body;
    let family = await InstrumentFamilyModel.findOne({ instrumentFamily });

    if (family) {
      let updated = false;

      for (const newType of instrumentTypes) {
        const existingType = family.instrumentTypes.find(
          (t) => t.type.toLowerCase() === newType.type.toLowerCase()
        );

        if (existingType) {
          const newServices = newType.serviceType.filter(
            (srv) => !existingType.serviceType.includes(srv)
          );
          if (newServices.length) {
            existingType.serviceType.push(...newServices);
            updated = true;
          }
        } else {
          family.instrumentTypes.push(newType);
          updated = true;
        }
      }

      if (!updated) {
        return res.status(409).json({
          success: false,
          code: 409,
          message: "Already exists",
        });
      }

      await family.save();
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Updated successfully",
        data: family,
      });
    }

    const newFamily = await InstrumentFamilyModel.create({
      instrumentFamily,
      instrumentTypes,
    });

    return res.status(201).json({
      success: true,
      code: 201,
      message: "Created successfully",
      data: newFamily,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      code: 500,
      message: error.message,
    });
  }
};




const getAllInstrument = async (req, res) => {
  try {
    const name = req.query.name;
    const id = req.query.id;

    const result = await instrumentService.getAllInstrument({ name, id });

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Instrument fetched successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const getInstrumentById = async (req, res) => {
  try {
    const { id } = req.params; // get id from request params
    const result = await instrumentService.getInstrumentById(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: "Instrument not found",
      });
    }

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Instrument fetched successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};


const updateInstrumentName = async (req, res) => {
  try {
    const { instrumentId } = req.params;
    const result = await instrumentService.updateInstrument(
      instrumentId,
      req.body
    );

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Instrument updated successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};



const updateInstrument = async (req, res) => {
  try {
    const { instrumentId, typeId } = req.params; // <-- both IDs
    const result = await instrumentService.updateInstrument(
      instrumentId,
      typeId,
      req.body
    );

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Instrument updated successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};





const deleteInstrument = async (req, res) => {
  try {
    const { instrumentId } = req.params;
    await instrumentService.deleteInstrument(instrumentId);

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Instrument deleted successfully",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const instrumentController = {
  createInstrument,
  getAllInstrument,
  getInstrumentById,
  updateInstrument,
  updateInstrumentName,
  deleteInstrument,
};

module.exports = instrumentController;
