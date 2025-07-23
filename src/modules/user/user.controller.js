const config = require("../../config");
const userService = require("./user.service");

const createNewAccount = async (req, res) => {
  try {
    const result = await userService.createNewAccountInDB(req.body);

    const { refreshToken, accessToken, user } = result;
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: config.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      code: 200,
      message: "User created successfully, please verify your email",
      data: {
        accessToken,
        user,
      },
    });
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, code: 400, message: error.message });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { email } = req.user;
    const result = await userService.verifyUserEmail(req.body, email);
    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const resendOtpCode = async (req, res) => {
  try {
    const result = await userService.resendOtpCode(req.user);

    return res.status(200).json({
      success: true,
      message: "OTP resent successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { userType, sortBy, time } = req.query;

    const users = await userService.getAllUsersFromDb({
      userType,
      sortBy,
      time,
    });

    return res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: users,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const { email } = req.user;
    const user = await userService.getMyProfileFromDb({ email });

    return res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: user,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { email } = req.user;
    const result = await userService.updateUserProfile(
      req.body,
      email,
      req.file
    );

    return res.status(200).json({
      success: true,
      message: "User profile updated successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const deactiveAccount = async (req, res) => {
  try {
    const { email } = req.user;
    const result = await userService.deactiveAccount(email, req.body);

    return res.status(200).json({
      success: true,
      message: "Account deactivated successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const deletedUserAccount = async (req, res) => {
  try {
    const { userId } = req.user;
    const result = await userService.deletedUserAccount(userId);

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const addSupport = async (req, res) => {
  try {
    const result = await userService.addSupport(req.body);

    return res.status(200).json({
      success: true,
      message: "Support added successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const getSingleUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await userService.getSingleUser(userId);

    return res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: user,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const userController = {
  createNewAccount,
  verifyEmail,
  resendOtpCode,
  getAllUsers,
  getMyProfile,
  updateUserProfile,
  deactiveAccount,
  deletedUserAccount,
  addSupport,
  getSingleUser,
};

module.exports = userController;
