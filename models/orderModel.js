const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        products: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                    default: 1,
                },
                price: {
                    type: Number,
                    required: true,
                },
            },
        ],
        shippingAddress: {
            address: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            country: { type: String, required: true },
            postalCode: { type: String, required: true },
        },
        paymentMethod: {
            type: String,
            enum: ["esewa", "khalti", "cod"], // Allowed payment methods
            required: true,
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "completed", "failed"],
            default: "pending",
        },
        totalAmount: {
            type: Number,
            required: true,
        },
        orderStatus: {
            type: String,
            enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
            default: "pending",
        },
        transactionId: {
            type: String, // store esewa/khalti transaction ID, empty for COD
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);