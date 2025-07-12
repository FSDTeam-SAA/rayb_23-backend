const PictureModel = require("./picture.model");
const User = require("../user/user.model");
const BusinessModel = require("../business/business.model");
const createNotification = require("../../utils/createNotification");
const { sendImageToCloudinary } = require("../../utils/cloudnary");

exports.uploadPicture = async (req, res) => {
    try {
        const io = req.app.get("io");
        const { email: userEmail, userId: userID } = req.user;
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
        const data = JSON.parse(req.body.data);
        console.log(data);
        if (!data.business) {
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
        const newPictures = new PictureModel({
            image: uploadedImages,
            business: data.business,
            user: userID,
        })
        const picture = await newPictures.save();

        await BusinessModel.findByIdAndUpdate(data.business, {
            $push: { reviewImage: picture._id },
        });

        const message = `${user.name} has added a new picture`;
        const saveNotification = await createNotification(userID, message, "Picture");

        // Send to user
        io.to(userID.toString()).emit("new-notification", { saveNotification });

        // Send to admin(s)
        const admins = await User.find({ isVerified: true, userType: "admin" }).select("_id");
        admins.forEach(admin => {
            io.to(admin._id.toString()).emit("new-notification", { saveNotification });
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