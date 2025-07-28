const reportService = require("./report.service");

const addReport = async (req, res) => {
  try {
    const { email } = req.user;

    const result = await reportService.addReport(req.body, email);
    return res.status(200).json({
      success: true,
      message: "Report added successfully",
      data: result,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, message: error.message, error });
  }
};

const getAllReports = async (req, res) => {
  try {
    const result = await reportService.getAllReports();
    return res.status(200).json({
      success: true,
      message: "Reports retrieved successfully",
      data: result,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, message: error.message, error });
  }
};

const getMyReports = async (req, res) => {
  try {
    const { email } = req.user;
    const result = await reportService.getMyReports(email);

    return res.status(200).json({
      success: true,
      message: "Reports retrieved successfully",
      data: result,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, message: error.message, error });
  }
};

const getSingleReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const result = await reportService.getSingleReport(reportId);

    return res.status(200).json({
      success: true,
      message: "Report get successfully",
      data: result,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, message: error.message, error });
  }
};

const toggleReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const result = await reportService.toggleReport(reportId, req.body);

    return res.status(200).json({
      success: true,
      message: "Report toggled successfully",
      data: result,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, message: error.message, error });
  }
};

const reportController = {
  addReport,
  getAllReports,
  getMyReports,
  getSingleReport,
  toggleReport,
};

module.exports = reportController;
