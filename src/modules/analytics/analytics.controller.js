const analyticsService = require("./analytics.service");

const businessManDashboardAnalytics = async (req, res, next) => {
  try {
    const { email } = req.user;
    const { businessId } = req.params;
    const { filter } = req.query;
    const result = await analyticsService.businessManDashboardAnalytics(
      email,
      businessId,
      filter,
    );

    return res.status(200).json({
      success: true,
      message: "Analytics retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const analyticsController = {
  businessManDashboardAnalytics,
};

module.exports = analyticsController;
