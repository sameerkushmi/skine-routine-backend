const Order = require("../models/orderModel"); // your order model
const User = require("../models/userModel"); // your user model
const axios = require('axios')
const Product = require('../models/productModel')
const crypto = require('crypto')

const SUCCESS_URL = process.env.CLIENT_URL + process.env.SUCCESS_URL
const FAILED_URL = process.env.CLIENT_URL + process.env.FAILURE_URL
const {
    ESEWA_MERCHANT_CODE,
    ESEWA_SECRET_KEY,
    ESEWA_PAYMENT_URL,
    ESEWA_PAYMENT_VERIFY_URL
} = process.env

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
        const userId = req.userId;
        const { cartItems, address } = req.body;

        // 1. Validate input
        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        if (!address || !address.street || !address.city || !address.phone) {
            return res.status(400).json({ message: "Invalid shipping address" });
        }

        // 2. Check user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 3. Validate products & calculate total securely
        let subtotal = 0;

        const products = await Promise.all(
            cartItems.map(async (item) => {
                const product = await Product.findById(item.productId);

                if (!product) {
                    throw new Error("Product not found");
                }

                // Stock check
                if (product.stock < item.quantity) {
                    throw new Error(`${product.name} is out of stock`);
                }

                const price = product.price; // TRUST DB ONLY
                subtotal += price * item.quantity;

                return {
                    product: product._id,
                    quantity: item.quantity,
                    price,
                };
            })
        );

        // 4. Pricing
        const shipping = 100; // you can make dynamic later
        const totalAmount = subtotal + shipping;

        // 5. Generate transaction ID
        const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

        // 6. Create order (PENDING)
        const order = await Order.create({
            user: userId,
            products,
            shippingAddress: {
                address: address.street,
                city: address.city,
                state: address.state,
                postalCode: address.postalCode,
                country: address.country,
                phone: address.phone,
            },
            paymentMethod: "esewa",
            paymentStatus: "pending",
            orderStatus: "pending",
            subtotal,
            shipping,
            totalAmount,
            transactionId,
        });

        // 7. Generate eSewa signature
        const signedData = `total_amount=${totalAmount},transaction_uuid=${transactionId},product_code=${ESEWA_MERCHANT_CODE}`;

        const signature = crypto
            .createHmac("sha256", ESEWA_SECRET_KEY)
            .update(signedData)
            .digest("base64");

        // 8. Response to frontend
        res.status(201).json({
            success: true,
            message: "Order created. Proceed to payment.",
            orderId: order._id,

            payment: {
                url: ESEWA_PAYMENT_URL,
                method: "POST",

                params: {
                    amount: subtotal,
                    tax_amount: 0,
                    total_amount: totalAmount,
                    transaction_uuid: transactionId,
                    product_code: ESEWA_MERCHANT_CODE,

                    product_service_charge: 0,
                    product_delivery_charge: shipping,

                    success_url: SUCCESS_URL,
                    failure_url: FAILED_URL,

                    signed_field_names: "total_amount,transaction_uuid,product_code",
                    signature,
                },
            },
        });

    } catch (error) {
        console.error("eSewa Order Error:", error.message);

        res.status(500).json({
            success: false,
            message: error.message || "Server error",
        });
    }
};

// POST /api/orders/esewa/verify
exports.verifyEsewaPayment = async (req, res) => {
    try {
        const { transaction_uuid, total_amount, product_code } = req.body;

        if (!transaction_uuid || !total_amount || !product_code) {
            return res.status(400).json({
                success: false,
                message: "Invalid request"
            });
        }

        const order = await Order.findOne({ transactionId: transaction_uuid });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // ✅ GET request (IMPORTANT FIX)
        const response = await axios.get(
            `${process.env.ESEWA_PAYMENT_VERIFY_URL}?product_code=${product_code}&total_amount=${total_amount}&transaction_uuid=${transaction_uuid}`
        );

        console.log("eSewa verify response:", response.data);

        if (response.data.status === "COMPLETE") {
            order.paymentStatus = "completed";
            order.orderStatus = "processing";
            order.isPaid = true;
            order.paidAt = new Date();

            // Reduce stock
            for (const item of order.products) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { stock: -item.quantity }
                });
            }

            await order.save();

            return res.status(200).json({
                success: true,
                message: "Payment verified successfully",
                orderId: order._id
            });
        } else {
            order.paymentStatus = "failed";
            order.orderStatus = "cancelled";
            await order.save();

            return res.status(400).json({
                success: false,
                message: "Payment not completed"
            });
        }

    } catch (error) {
        console.error("eSewa Verify Error:", error.response?.data || error.message);

        return res.status(500).json({
            success: false,
            message: "Verification failed"
        });
    }
};