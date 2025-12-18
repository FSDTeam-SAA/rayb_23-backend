const Notification = require("../notification/notification.model");
const User = require("../user/user.model");
const ClaimBussiness = require("./claimBussiness.model");
const claimBussinessService = require("./claimBussiness.service");

//TODO: When admin approved then user userType is changed.

const documentVerification = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { email } = req.user;
    const { businessId } = req.params;

    // Call the service
    const result = await claimBussinessService.documentVerification(
      req.body,
      email,
      req.files,
      businessId
    );

    const user = await User.findOne({ email });

    // Notify user
    const notifyUser = await Notification.create({
      senderId: null,
      receiverId: user._id,
      userType: "user",
      type: "document_verified",
      title: "Document Verification Successful",
      message: `Your claim business documents have been successfully verified. Waiting for admin approval.`,
      metadata: { businessId },
    });
    io.to(`${user._id}`).emit("new_notification", notifyUser);

    // Notify admins
    const admins = await User.find({ userType: "admin" });
    for (const admin of admins) {
      const notifyAdmin = await Notification.create({
        senderId: user._id,
        receiverId: admin._id,
        userType: "admin",
        type: "claim_verification_done",
        title: "Claim Business Ready for Approval",
        message: `${user.name} has submitted verified documents for a claim business. Please review and approve.`,
        metadata: { businessId },
      });
      io.to(`${admin._id}`).emit("new_notification", notifyAdmin);
    }

    return res.status(200).json({
      success: true,
      code: 200,
      message: "Document verified successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      code: 400,
      message: error.message,
    });
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

const claimBusinessById = async (req, res) => {
  try {
    const { claimBusinessId } = req.params;

    const result = await claimBussinessService.getClaimBusinessById(
      claimBusinessId
    );

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

const toggleClaimBussinessStatus = async (req, res) => {
  try {
    const { claimBusinessId } = req.params;
    const { status } = req.body;
    const io = req.app.get("io");
    console.log(req.params);

    const result = await claimBussinessService.toggleClaimBussinessStatus(
      claimBusinessId,
      req.body
    );

    const claimBusiness = await ClaimBussiness.findById(
      claimBusinessId
    ).populate("userId");

    if (!claimBusiness) {
      return res.status(404).json({
        success: false,
        message: "Claim business not found",
      });
    }
    const user = claimBusiness.userId;

    // Send notification to user based on status
    let title = "";
    let message = "";

    if (status === "approved") {
      title = "Claim Approved";
      message = `Your claim business request has been approved by the admin.`;
    } else if (status === "rejected") {
      title = "Claim Rejected";
      message = `Your claim business request has been rejected by the admin.`;
    }

    if (status === "approved" || status === "rejected") {
      const notify = await Notification.create({
        senderId: null, // or admin._id if you want to show admin
        receiverId: user._id,
        userType: "user",
        type: "claim_status_change",
        title,
        message,
        metadata: { claimBusinessId },
      });

      io.to(`${user._id}`).emit("new_notification", notify);
    }

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
    const { businessId } = req.params;
    await claimBussinessService.sendOtp(req.body, businessId);

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
    const io = req.app.get("io");
    const { email } = req.user;
    const { businessId } = req.params;
    const result = await claimBussinessService.bussinessEmailVerify(
      email,
      businessId,
      req.body
    );

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const admins = await User.find({ userType: "admin" });

    for (const admin of admins) {
      const notify = await Notification.create({
        senderId: user._id,
        receiverId: admin._id,
        userType: "admin",
        type: "email_verified",
        title: "Business Email Verified",
        message: `${user.name} has verified their business email.`,
        metadata: { businessId },
      });

      io.to(`${admin._id}`).emit("new_notification", notify);
    }

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
  claimBusinessById,
  toggleClaimBussinessStatus,
  sendOtp,
  bussinessEmailVerify,
};

module.exports = claimBussinessController;
