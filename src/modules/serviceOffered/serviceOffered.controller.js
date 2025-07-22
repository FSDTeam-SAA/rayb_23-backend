const serviceOfferedService = require("./serviceOffered.service");

const createServiceOffered = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { email } = req.user;
    const result = await serviceOfferedService.createServiceOffered(
      email,
      req.body
    );

    const admins = await User.find({ userType: "admin" });

    for (const admin of admins) {
      const notify = await Notification.create({
        senderId: user._id,
        receiverId: admin._id,
        userType: "admin",
        type: "service_offered_created",
        title: "New Service Offered Created",
        message: `${user.name} created a new service offered: "${result.name || ''}"`,
        metadata: { serviceOfferedId: result._id },
      });

      io.to(`admin_${admin._id}`).emit("new_notification", notify);
    }

    return res.status(201).json({
      success: true,
      message: "Service offered created successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      error: error,
    });
  }
};

const getMyServiceOffered = async (req, res) => {
  try {
    const { email } = req.user;
    const result = await serviceOfferedService.getMyServiceOffered(email);

    return res.status(200).json({
      success: true,
      message: "My services offered retrieved successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      error: error,
    });
  }
};

const addServicePricing = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { email } = req.user;
    const { serviceOfferedId } = req.params;
    const result = await serviceOfferedService.addServicePricing(
      email,
      req.body,
      serviceOfferedId
    );
    const admins = await User.find({ userType: "admin" });

    for (const admin of admins) {
      const notify = await Notification.create({
        senderId: user._id,
        receiverId: admin._id,
        userType: "admin",
        type: "service_pricing_added",
        title: "New Pricing Added to Service",
        message: `${user.name} added new pricing to a service: "${result.serviceName || ''}"`,
        metadata: { serviceOfferedId, pricingId: result._id },
      });

      io.to(`admin_${admin._id}`).emit("new_notification", notify);
    }
    return res.status(200).json({
      success: true,
      message: "Service pricing added successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      error: error,
    });
  }
};

const serviceOfferedController = {
  createServiceOffered,
  getMyServiceOffered,
  addServicePricing,
};

module.exports = serviceOfferedController;
