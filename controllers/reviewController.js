const ReviewModel = require('../models/reviewModel')

exports.createAndUpdate = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const { productId } = req.params;
        const userId = req.userId;

        let review = await ReviewModel.findOne({ user: userId, product: productId });

        if (review) {
            // Update existing review
            review.rating = rating;
            review.comment = comment;
            await review.save();
            return res.status(200).json({ message: "Review updated", review });
        }

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
        res.status(500).json({ message: "Server error" });
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