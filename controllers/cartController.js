const Cart = require("../models/cartModel.js")
const Product = require("../models/productModel.js")

exports.addToCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId, quantity } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            cart = new Cart({
                user: userId,
                items: [{ product: productId, quantity }]
            });
        } else {
            const itemIndex = cart.items.findIndex(
                item => item.product.toString() === productId
            );

            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += quantity;
            } else {
                cart.items.push({ product: productId, quantity });
            }
        }

        await cart.save();

        res.json({
            success: true,
            message: "Item added to cart",
            cart
        });

    } catch (error) {
        console.log("Add to cart error:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id })
            .populate("items.product");

        res.json({
            success: true,
            cart: cart || { items: [] }
        });

    } catch (error) {
        console.log("Get cart error:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.updateCartItem = async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        let cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        const item = cart.items.find(
            item => item.product.toString() === productId
        );

        if (!item) {
            return res.status(404).json({ message: "Item not in cart" });
        }

        item.quantity = quantity;

        await cart.save();

        res.json({
            success: true,
            message: "Cart updated",
            cart
        });

    } catch (error) {
        console.log("Update cart error:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.removeCartItem = async (req, res) => {
    try {
        const { productId } = req.params;

        let cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        cart.items = cart.items.filter(
            item => item.product.toString() !== productId
        );

        await cart.save();

        res.json({
            success: true,
            message: "Item removed",
            cart
        });

    } catch (error) {
        console.log("Remove item error:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.clearCart = async (req, res) => {
    try {
        await Cart.findOneAndUpdate(
            { user: req.user._id },
            { items: [] }
        );

        res.json({
            success: true,
            message: "Cart cleared"
        });

    } catch (error) {
        console.log("Clear cart error:", error);
        res.status(500).json({ message: error.message });
    }
};