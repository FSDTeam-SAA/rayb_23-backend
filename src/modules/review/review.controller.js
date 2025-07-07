const Review = require("./review.model");
const Business = require("../business/business.model");
const User = require("../user/user.model");
const { sendImageToCloudinary } = require("../../utils/cloudnary"); // assume you're using this

//Create review

exports.createReview = async (req, res) => {
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
                message: "At least one image is required",
            });
        }

        // Parse other form-data fields (rating, feedback, businessId)
        const data = JSON.parse(req.body.data);

        const { rating, feedback, business } = data;
        // const businessId = await business.findOne({ _id: business })
        if (!business) {
            return res.status(400).json({ success: false, message: "Business ID is required" });
        }

        // Upload images to Cloudinary
        const uploadedImages = await Promise.all(
            files.map(async (file) => {
                const imageName = `reviews/${Date.now()}_${file.originalname}`;
                const { secure_url } = await sendImageToCloudinary(imageName, file.path);
                return secure_url;
            })
        );

        // Create review
        const review = await Review.create({
            rating,
            feedback,
            image: uploadedImages,
            business: business,
            user: user._id,
        });

        // Push review into Business model
        await Business.findByIdAndUpdate(business, {
            $push: { review: review._id },
        });

        return res.status(201).json({
            status: true,
            message: "Review created successfully",
            review,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: false,
            message: "Server error",
            error: error.message,
        });
    }
};


//get all review by admin.

exports.getReviewsByAdmin = async (req, res) => {
    try {
        const { email: userEmail } = req.user;
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(400).json({ status: false, message: "User not found" });
        };
        if (user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admins only.",
            });
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const totalReviews = await Review.countDocuments();


        const reviews = await Review.find()
            .populate("business")
            .populate("user")
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            status: true,
            message: "Review fetched successfully",
            currentPage: page,
            totalPages: Math.ceil(totalReviews / limit),
            totalItems: totalReviews,
            data: reviews
        });

    } catch (err) {
        res.status(500).json({
            status: false,
            message: "Server error",
            error: err.message,
        });
    }
};
exports.getReviews = async (req, res) => {
    try {

        const { email: userEmail } = req.user;
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(400).json({ status: false, message: "User not found" });
        };

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const totalReviews = await Review.countDocuments();

        const reviews = await Review.find()
            .populate("business")
            .populate("user")
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        return res.status(200).json({
            status: true,
            message: "Review fetched successfully",
            currentPage: page,
            totalPages: Math.ceil(totalReviews / limit),
            totalItems: totalReviews,
            data: reviews
        });
    } catch (err) {
        res.status(500).json({
            status: false,
            message: "Server error",
            error: err.message,
        });
    }
};

exports.getMyReview = async (req, res) => {
    try {

    }
    catch (err) {
        return res.status(500).json({
            status: false,
            message: "Server error",
            error: err.message,
        });
    }
}

