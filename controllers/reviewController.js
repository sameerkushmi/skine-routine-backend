const ReviewModel = require('../models/reviewModel')

exports.createReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const { productId } = req.params;
        const userId = req.userId;

        // Create new review
        review = await ReviewModel.create({
            user: userId,
            product: productId,
            rating,
            comment
        });

        res.status(201).json({ message: "Review created", review });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
}

exports.getReviewsByProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const reviews = await ReviewModel.find({ product: productId })
            .populate("user", "name email avatar") // optional: include user info
            .sort({ createdAt: -1 });

        const avgRating = reviews.length
            ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
            : 0;

        res.json({ reviews, avgRating, totalReviews: reviews.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
}

exports.updateReview = async (req, res) => {
    try {
        const userId = req.userId;
        const { reviewId } = req.params;
        const { rating, comment } = req.body;
        const review = await ReviewModel.findOneAndUpdate(
            { _id: reviewId, user: userId },
            { rating, comment },
            { new: true }
        );

        res.json({ message: "Review updated", review });
    } catch (error) {
        console.log('update review error :', error)
        res.status(500).json({ message: error.message });
    }
}

exports.deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.userId;

        const review = await ReviewModel.findOneAndDelete({
            _id: reviewId,
            user: userId
        });

        if (!review) {
            return res.status(404).json({ message: "Review not found or unauthorized" });
        }

        res.json({ message: "Review deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
}