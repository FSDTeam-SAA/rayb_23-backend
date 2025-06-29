const claimBussinessService = require("./claimBussiness.service");

//TODO: When admin approved then user userType is changed.

const verifyPhoneNumber = (req, res) => {};

const documentVerification = async (req, res) => {
  try {
    const { email } = req.user;
    const { bussinessId } = req.params;

    const result = await claimBussinessService.documentVerification(
      req.body,
      email,
      req.files,
      bussinessId
    );

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Document verified successfully",
      data: result,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, code: 400, message: error.message });
  }
};

const getAllClaimBussiness = async (req, res) => {
  try {
    const result = await claimBussinessService.getAllClaimBussiness();

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Claim bussiness retrieved successfully",
      data: result,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, code: 400, message: error.message });
  }
};

const getMyClaimBussiness = async (req, res) => {
  try {
    const { email } = req.user;
    const result = await claimBussinessService.getMyClaimBussiness(email);

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Claim bussiness retrieved successfully",
      data: result,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, code: 400, message: error.message });
  }
};

const toggleClaimBussinessStatus = async (req, res) => {
  try {
    const { bussinessId } = req.params;
    const result = await claimBussinessService.toggleClaimBussinessStatus(
      bussinessId,
      req.body
    );

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Claim bussiness status updated successfully",
      data: result,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, code: 400, message: error.message });
  }
};

const claimBussinessController = {
  verifyPhoneNumber,
  documentVerification,
  getAllClaimBussiness,
  getMyClaimBussiness,
  toggleClaimBussinessStatus,
};

module.exports = claimBussinessController;
