const claimBussinessService = require("./claimBussiness.service");

//TODO: When admin approved then user userType is changed.

const documentVerification = async (req, res) => {
  try {
    const { email } = req.user;
    const { businessId } = req.params;

    const result = await claimBussinessService.documentVerification(
      req.body,
      email,
      req.files,
      businessId
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
    const { claimType, time, sortBy } = req.query;

    const result = await claimBussinessService.getAllClaimBussiness({
      claimType,
      time,
      sortBy,
    });

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Claim business retrieved successfully",
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
      message: "Your claim business retrieved successfully",
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
    const { claimBusinessId } = req.params;
    console.log(req.params);

    const result = await claimBussinessService.toggleClaimBussinessStatus(
      claimBusinessId,
      req.body
    );

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Claim business status updated successfully",
      data: result,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json({ success: false, code: 400, message: error.message });
  }
};

const sendOtp = async (req, res) => {
  try {
    const { bussinessId } = req.params;
    const result = await claimBussinessService.sendOtp(req.body, bussinessId);

    return res.status(200).json({
      success: true,
      code: 200,
      message: "OTP sent successfully",
      // data: result,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, code: 400, message: error.message });
  }
};

const bussinessEmailVerify = async (req, res) => {
  try {
    const { email } = req.user;
    const { businessId } = req.params;
    const result = await claimBussinessService.bussinessEmailVerify(
      email,
      businessId,
      req.body
    );

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Email verified successfully",
      data: result,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, code: 400, message: error.message });
  }
};

const claimBussinessController = {
  documentVerification,
  getAllClaimBussiness,
  getMyClaimBussiness,
  toggleClaimBussinessStatus,
  sendOtp,
  bussinessEmailVerify,
};

module.exports = claimBussinessController;
