// controllers/wishlistController.js
import Wishlist from "../models/WishlistModel.js";

export const addToWishlist = async (req, res) => {
    try {
        const userId = req.user._id; // from auth middleware
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

export const getWishlist = async (req, res) => {
    try {
        const userId = req.user._id;

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

export const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.user._id;
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

export const clearWishlist = async (req, res) => {
    try {
        const userId = req.user._id;

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