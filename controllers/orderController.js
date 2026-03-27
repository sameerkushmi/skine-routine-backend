const Order = require("../models/orderModel"); // your order model
const User = require("../models/userModel"); // your user model
const axios = require('axios')
const Product = require('../models/productModel')

const SUCCESS_URL = process.env.CLIENT_URL + process.env.SUCCESS_URL
const FAILED_URL = process.env.CLIENT_URL + process.env.FAILURE_URL

// CREATE COD ORDER
exports.createCODOrder = async (req, res) => {
    try {
        const userId = req.userId
        const { paymentMethod, cartItems, address } = req.body;

        if (!cartItems || !cartItems.length) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Calculate totals
        const subtotal = cartItems.reduce(
            (acc, item) => acc + item.price * item.quantity,
            0
        );
        const shipping = 100; // fixed shipping
        const totalAmount = subtotal + shipping;

        await Order.create({
            user: userId,
            products: cartItems.map((item) => ({
                product: item.productId,
                quantity: item.quantity,
                price: item.price,
            })),
            shippingAddress: {
                address: address.street,
                city: address.city,
                state: address.state,
                postalCode: address.postalCode,
                country: address.country,
                phone: address.phone
            },
            paymentMethod: paymentMethod, // "esewa"
            paymentStatus: "pending", // will be updated after eSewa callback
            totalAmount,
        });

        res.status(201).json({
            success: true,
            message: "Order placed successfully (Cash on Delivery)",
        });

    } catch (error) {
        console.error("COD Order Error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// GET ALL ORDERS 

exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("user", "name email")
            .populate("products.product")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            orders,
        });
    } catch (error) {
        console.log('get all orders error', error)
        res.status(500).json({ message: "Server error" });
    }
}

// GET MY ORDERS
exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.userId })
            .populate("products.product")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            orders,
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// GET SINGLE ORDER
exports.getSingleOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("products.product");

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.json({
            success: true,
            order,
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// POST /api/orders/esewa
exports.createEsewaOrder = async (req, res) => {
    try {
        const userId = req.userId
        const { paymentMethod, cartItems, address } = req.body;

        if (!cartItems || !cartItems.length) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        // Fetch user
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Calculate totals
        const subtotal = cartItems.reduce(
            (acc, item) => acc + item.price * item.quantity,
            0
        );
        const shipping = 100; // fixed shipping
        const totalAmount = subtotal + shipping;

        // Create order
        const order = await Order.create({
            user: userId,
            products: cartItems.map((item) => ({
                product: item.productId,
                quantity: item.quantity,
                price: item.price,
            })),
            shippingAddress: {
                address: address.street,
                city: address.city,
                state: address.state,
                postalCode: address.postalCode,
                country: address.country,
                phone: address.phone
            },
            paymentMethod: paymentMethod, // "esewa"
            paymentStatus: "pending", // will be updated after eSewa callback
            totalAmount,
        });

        // Respond with order and total for eSewa
        res.status(201).json({
            message: "Order created successfully",
            orderId: order._id,
            totalAmount: order.totalAmount,
            esewaPaymentUrl: `https://esewa.com.np/epay/main?amt=${totalAmount}&pdc=0&txAmt=0&tAmt=${totalAmount}&scd=${process.env.ESEWA_MERCHANT_CODE}&pid=${order._id}&su=${SUCCESS_URL}&fu=${FAILED_URL}`
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// POST /api/orders/esewa/verify
exports.verifyEsewaPayment = async (req, res) => {
    try {
        const { orderId, amt, refId, pid } = req.body;

        if (!orderId || !amt || !refId || !pid) {
            return res.status(400).json({ message: "Missing payment data" });
        }

        // Fetch order
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: "Order not found" });

        // Prepare eSewa verification payload
        const payload = new URLSearchParams({
            amt: amt.toString(),
            psc: "0",
            pdc: "0",
            tAmt: amt.toString(),
            pid: pid.toString(),
            scd: process.env.ESEWA_MERCHANT_CODE, // Your eSewa merchant code
        }).toString();

        // Verify with eSewa
        const response = await axios.post(
            "https://esewa.com.np/epay/transrec",
            payload,
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        // eSewa responds with status
        if (response.data.includes("Success")) {
            order.paymentStatus = "completed";
            order.transactionId = refId;
            await order.save();

            return res.status(200).json({ message: "Payment verified successfully", order });
        } else {
            order.paymentStatus = "failed";
            await order.save();

            return res.status(400).json({ message: "Payment verification failed" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};