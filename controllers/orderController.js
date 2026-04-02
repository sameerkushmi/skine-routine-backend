const Order = require("../models/orderModel"); // your order model
const User = require("../models/userModel"); // your user model
const axios = require('axios')
const Product = require('../models/productModel')
const crypto = require('crypto')
const mongoose = require('mongoose')

const SUCCESS_URL = process.env.CLIENT_URL + process.env.SUCCESS_URL
const FAILED_URL = process.env.CLIENT_URL + process.env.FAILURE_URL
const {
    ESEWA_MERCHANT_CODE,
    ESEWA_SECRET_KEY,
    ESEWA_PAYMENT_URL,
    ESEWA_PAYMENT_VERIFY_URL,
    KHALTI_BASE_URL,
    KHALTI_SECRET_KEY,
    CLIENT_URL
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
            subtotal,
            shipping,
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
        let {
            page = 1,
            limit = 10,
            search = "",
            status = "",
            paymentMethod = "",
        } = req.query;

        page = parseInt(page);
        limit = parseInt(limit);

        const query = {};

        // STATUS
        if (status) query.orderStatus = status;

        // PAYMENT
        if (paymentMethod) query.paymentMethod = paymentMethod;

        // SEARCH (ADVANCED 🔥)
        if (search) {
            const users = await User.find({
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                ],
            }).select("_id");

            const userIds = users.map((u) => u._id);

            query.$or = [
                { _id: mongoose.Types.ObjectId.isValid(search) ? search : null },
                { user: { $in: userIds } },
            ];
        }

        const orders = await Order.find(query)
            .populate("user", "name email")
            .populate("products.product")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const totalOrders = await Order.countDocuments(query);

        res.status(200).json({
            orders,
            totalPages: Math.ceil(totalOrders / limit),
            currentPage: page,
            totalOrders,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch orders" });
    }
};

// GET MY ORDERS
exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.userId })
            .populate("products.product")
            .sort({ createdAt: -1 });

        const totalOrders = await Order.countDocuments({ user: req.userId });
        res.json({
            success: true,
            orders,
            totalOrders,
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

// PATCH /api/orders/:id/status
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const validStatus = ["pending", "processing", "shipped", "delivered", "cancelled"];

        if (!validStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status",
            });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        // ✅ Prevent invalid transitions (optional but recommended)
        if (order.orderStatus === "delivered") {
            return res.status(400).json({ message: "Order already delivered" });
        }

        order.orderStatus = status;

        // Optional: auto update payment for COD when delivered
        if (status === "delivered" && order.paymentMethod === "cod") {
            order.paymentStatus = "completed";
            // reduce stock
            for (const item of order.products) {
                const product = await Product.findById(item.product);
                product.stock -= item.quantity;
                await product.save();
            }
        }

        // 🔥 AUTO TIMESTAMPS
        if (status === "shipped" && !order.shippedAt) {
            order.shippedAt = new Date();
        }

        if (status === "delivered" && !order.deliveredAt) {
            order.deliveredAt = new Date();
        }

        // Optional: clear if rolled back
        if (status !== "shipped") {
            order.shippedAt = null;
        }

        if (status !== "delivered") {
            order.deliveredAt = null;
        }

        await order.save();

        res.json({
            success: true,
            message: "Order status updated",
            order,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.getCompletedPaymentTotal = async (req, res) => {
    try {
        const result = await Order.aggregate([
            {
                $match: {
                    paymentStatus: "completed", // filter completed payments
                },
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$totalAmount" },
                },
            },
        ]);

        const total = result.length > 0 ? result[0].totalAmount : 0;

        res.status(200).json({
            success: true,
            totalCompletedAmount: total,
        });
    } catch (error) {
        console.error("Error fetching total completed payments:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
        });
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
            `${ESEWA_PAYMENT_VERIFY_URL}?product_code=${product_code}&total_amount=${total_amount}&transaction_uuid=${transaction_uuid}`
        );

        if (response.data.status === "COMPLETE") {
            order.paymentStatus = "completed";
            order.orderStatus = "processing";
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

// POST /api/orders/khalti/
exports.createKhaltiOrder = async (req, res) => {
    try {        // 1️⃣ Validate input
        const userId = req.userId;
        const { cartItems, address } = req.body;
        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }
        if (!address || !address.street || !address.city || !address.phone) {
            return res.status(400).json({ message: "Invalid shipping address" });
        }

        // 2️⃣ Validate user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 3️⃣ Validate products & calculate total securely
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

        // 4️⃣ Pricing
        const shipping = 100; // you can make dynamic later
        const totalAmount = subtotal + shipping;

        // 5️⃣ Create order (PENDING)
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
            paymentMethod: "khalti",
            paymentStatus: "pending",
            orderStatus: "pending",
            subtotal,
            shipping,
            totalAmount,
        });

        // Call Khalti initiate API
        const response = await axios.post(
            KHALTI_BASE_URL,
            {
                return_url: `${CLIENT_URL}/payment-callback`,
                website_url: CLIENT_URL,
                amount: totalAmount * 100, // paisa
                purchase_order_id: order._id.toString(),
                purchase_order_name: `Order ${order._id}`,
                customer_info: {
                    name: user.name,
                    email: user.email,
                    phone: user.phone
                }
            },
            {
                headers: {
                    "Authorization": `Key ${KHALTI_SECRET_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        // Save pidx
        order.pidx = response.data.pidx;
        await order.save();


        res.status(201).json({
            success: true,
            message: "Order created. Proceed to Khalti payment.",
            orderId: order._id,
            totalAmount,
            payment_url: response.data.payment_url
        });

    } catch (error) {
        console.error("Khalti Order Error:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Server error",
        });
    }
};

// POST /api/orders/khalti/verify
exports.verifyKhaltiPayment = async (req, res) => {
    try {
        const { pidx, orderId } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // 🔥 Call Khalti Lookup API
        const response = await axios.post(
            "https://dev.khalti.com/api/v2/epayment/lookup/",
            { pidx },
            {
                headers: {
                    Authorization: `Key ${KHALTI_SECRET_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const data = response.data;

        // ✅ Check status
        if (data.status === "Completed") {
            order.paymentStatus = "completed";
            order.orderStatus = "processing";
            order.transactionId = data.transaction_id;
            order.paidAt = new Date();

            // Reduce stock
            for (const item of order.products) {
                const product = await Product.findById(item.product);
                product.stock -= item.quantity;
                await product.save();
            }


            await order.save();

            return res.json({ success: true });
        } else {
            order.paymentStatus = "failed";
            order.orderStatus = "cancelled";
            await order.save();
            return res.json({ success: false, status: data.status });
        }

    } catch (error) {
        console.error("Khalti Verify Error:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: "Verification failed"
        });
    }
};

// Additional admin routes for analytics, revenue, etc. can be added here
exports.getPaymentAnalytics = async (req, res) => {
    try {
        // 1. Overall Stats
        const stats = await Order.aggregate([
            {
                $group: {
                    _id: null,

                    totalOrders: { $sum: 1 },

                    totalRevenue: {
                        $sum: {
                            $cond: [
                                { $eq: ["$paymentStatus", "completed"] },
                                "$totalAmount",
                                0
                            ]
                        }
                    },

                    paidOrders: {
                        $sum: {
                            $cond: [
                                { $eq: ["$paymentStatus", "completed"] },
                                1,
                                0
                            ]
                        }
                    },

                    pendingPayments: {
                        $sum: {
                            $cond: [
                                { $eq: ["$paymentStatus", "pending"] },
                                1,
                                0
                            ]
                        }
                    },

                    failedPayments: {
                        $sum: {
                            $cond: [
                                { $eq: ["$paymentStatus", "failed"] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // 2. Payment Method Breakdown
        const paymentMethods = await Order.aggregate([
            {
                $group: {
                    _id: "$paymentMethod",
                    count: { $sum: 1 },
                    revenue: {
                        $sum: {
                            $cond: [
                                { $eq: ["$paymentStatus", "completed"] },
                                "$totalAmount",
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // 3. Daily Revenue (last 7 days)
        const dailyRevenue = await Order.aggregate([
            {
                $match: {
                    paymentStatus: "completed",
                    createdAt: {
                        $gte: new Date(new Date().setDate(new Date().getDate() - 7))
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt"
                        }
                    },
                    revenue: { $sum: "$totalAmount" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 4. Response
        res.status(200).json({
            success: true,

            summary: stats[0] || {
                totalOrders: 0,
                totalRevenue: 0,
                paidOrders: 0,
                pendingPayments: 0,
                failedPayments: 0
            },

            paymentMethods,
            dailyRevenue
        });

    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch analytics"
        });
    }
};
