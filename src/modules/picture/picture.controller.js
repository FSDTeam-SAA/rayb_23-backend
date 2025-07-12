const PictureModel = require("./picture.model");
const User = require("../user/user.model");
const BusinessModel = require("../business/business.model");

exports.uploadPicture = async (req, res) => {
    try {
        const { email: userEmail } = req.user;
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(400).json({ status: false, message: "User not found" });
        }

        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                code: 500,
                message: "At least one image is required",
            });
        }
        const { business } = data;
        if (!business) {
            return res
                .status(400)
                .json({ success: false, message: "Business ID is required" });
        }

        // Upload images to Cloudinary
        const uploadedImages = await Promise.all(
            files.map(async (file) => {
                const imageName = `Picture/${Date.now()}_${file.originalname}`;
                const { secure_url } = await sendImageToCloudinary(
                    imageName,
                    file.path
                );
                return secure_url;
            })
        );
        const picture = await PictureModel.create({
            image: uploadedImages,
            business: business,
            user: user._id,
        });

        await BusinessModel.findByIdAndUpdate(business, {
            $push: { reviewImage: picture._id },
        });

        return res.status(201).json({
            status: true,
            message: "Picture Uploaded successfully",
            picture
        })
    }
    catch (error) {
        res.status(500).json({
            status: false,
            message: "server error",
            error: error.message
        })
    }
}