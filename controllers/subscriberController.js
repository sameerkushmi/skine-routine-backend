const Subscriber = require("../models/subscribeModel");

// @desc    Add new subscriber
// @route   POST /api/subscribers
// @access  Public
exports.addSubscriber = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        // Check if already subscribed
        const existing = await Subscriber.findOne({ email });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Email is already subscribed",
            });
        }

        const subscriber = await Subscriber.create({ email });

        res.status(201).json({
            success: true,
            message: "Subscribed successfully",
            subscriber,
        });
    } catch (err) {
        console.error("Add Subscriber Error:", err);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// @desc    Get all subscribers
// @route   GET /api/subscribers
// @access  Private/Admin
exports.getSubscribers = async (req, res) => {
    try {
        const subscribers = await Subscriber.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            subscribers,
        });
    } catch (err) {
        console.error("Get Subscribers Error:", err);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// @desc    Delete a subscriber
// @route   DELETE /api/subscribers/:id
// @access  Private/Admin
exports.deleteSubscriber = async (req, res) => {
    try {
        const subscriber = await Subscriber.findById(req.params.id);

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: "Subscriber not found",
            });
        }

        await subscriber.deleteOne();

        res.status(200).json({
            success: true,
            message: "Subscriber removed",
        });
    } catch (err) {
        console.error("Delete Subscriber Error:", err);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};