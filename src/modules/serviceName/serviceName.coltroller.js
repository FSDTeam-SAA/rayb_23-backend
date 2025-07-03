const User = require("../user/user.model");
const ServiceNameModel = require("./serviceName.model");

// ✅ Create a new service name
exports.createServiceName = async (req, res) => {
  try {
    const { userId: UserId } = req.user;
    const { serviceNames } = req.body; // Array of service names

    if (!serviceNames || !Array.isArray(serviceNames) || serviceNames.length === 0) {
      return res.status(400).json({
        success: false,
        message: "serviceNames must be a non-empty array of strings"
      });
    }

    const user = await User.findById(UserId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const createdServices = [];

    for (const name of serviceNames) {
      const exists = await ServiceNameModel.findOne({ ServiceName: name });
      if (!exists) {
        const newService = new ServiceNameModel({
          ServiceName: name,
          status
        });
        const saved = await newService.save();
        createdServices.push(saved);
      }
    }

    return res.status(201).json({
      success: true,
      message:
        createdServices.length > 0
          ? "Service names created successfully"
          : "All service names already exist",
      data: createdServices
    });

  } catch (error) {
    console.error("Error in createServiceName:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// ✅ Get all service names
exports.getAllServiceNames = async (req, res) => {
  try {
    const services = await ServiceNameModel.find();
    res.status(200).json({
      success: true,
      message: "Service names fetched successfully",
      data: services
    });
  } catch (error) {
    console.error("Error in getAllServiceNames:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

// ✅ Update service status
// exports.updateServiceNameStatus = async (req, res) => {
//   try {
//     const { userId: UserId } = req.user;
//     const { id } = req.params;
//     const { status } = req.body;

//     // if (!status || !['active', 'inactive'].includes(status)) {
//     //   return res.status(400).json({
//     //     success: false,
//     //     message: "Status must be either 'active' or 'inactive'"
//     //   });
//     // }

//     const user = await User.findById(UserId);
//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     const updated = await ServiceNameModel.findByIdAndUpdate(id, { status }, { new: true });

//     if (!updated) {
//       return res.status(404).json({
//         success: false,
//         message: "Service name not found"
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Service status updated successfully",
//       data: updated
//     });

//   } catch (error) {
//     console.error("Error in updateServiceNameStatus:", error);
//     res.status(500).json({ success: false, message: "Internal server error", error: error.message });
//   }
// };

// ✅ Delete a service name by ID
exports.deleteServiceName = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await ServiceNameModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Service name not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Service name deleted successfully",
      data: deleted
    });

  } catch (error) {
    console.error("Error in deleteServiceName:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};
