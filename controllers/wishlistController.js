const Wishlist = require('../models/wishlistModel')

exports.addToWishlist = async (req, res) => {
    try {
        const userId = req.userId; // from auth middleware
        const { productId } = req.body;

        let wishlist = await Wishlist.findOne({ user: userId });

        if (!wishlist) {
            wishlist = await Wishlist.create({
                user: userId,
                products: [productId]
            });
        } else {
            const exists = wishlist.products.includes(productId);

            if (exists) {
                return res.status(400).json({
                    success: false,
                    message: "Product already in wishlist"
                });
            }

            wishlist.products.push(productId);
            await wishlist.save();
        }

        res.json({
            success: true,
            message: "Added to wishlist",
            wishlist
        });
    } catch (error) {
        console.log("Add wishlist error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getWishlist = async (req, res) => {
    try {
        const userId = req.userId;

        const wishlist = await Wishlist.findOne({ user: userId })
            .populate("products");

        res.json({
            success: true,
            wishlist: wishlist || { products: [] }
        });
    } catch (error) {
        console.log("Get wishlist error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = req.userId;
        const { productId } = req.params;

        const wishlist = await Wishlist.findOne({ user: userId });

        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: "Wishlist not found"
            });
        }

        wishlist.products = wishlist.products.filter(
            (item) => item.toString() !== productId
        );

        await wishlist.save();

        res.json({
            success: true,
            message: "Removed from wishlist",
            wishlist
        });
    } catch (error) {
        console.log("Remove wishlist error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.clearWishlist = async (req, res) => {
    try {
        const userId = req.userId;

        await Wishlist.findOneAndUpdate(
            { user: userId },
            { products: [] }
        );

        res.json({
            success: true,
            message: "Wishlist cleared"
        });
    } catch (error) {
        console.log("Clear wishlist error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};