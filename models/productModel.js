// Product Schema (Mongoose)
const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true }, // SEO friendly URL
    description: { type: String, required: true },
    shortDescription: {
        type: String,
        required: true,
        maxlength: 180
    },
    category: { type: String, required: true }, // e.g., 'Serum', 'Cleanser'
    tags: [{ type: String }], // optional, e.g., ["Vitamin C", "Brightening"]
    images: [{
        url: {
            type: String,
            required: true,
        },
        public_id: {
            type: String,
            required: true,
        }
    }], // URLs
    price: { type: Number, required: true },
    oldPrice: { type: Number }, // for discounts
    stock: { type: Number, default: 0 }, // inventory count
    sku: { type: String}, // Stock Keeping Unit
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    reviews: [ReviewSchema],
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    ingredients: [{ type: String }], // optional, array of ingredient names
    usage: [
        {
            step: { type: String },
            instruction: { type: String },
        },
    ],
    additionalInfo: { type: String }, // e.g., shelf life, skin type suitability
}, { timestamps: true });

// Index for text search on name, brand, description
ProductSchema.index({ name: 'text', brand: 'text', description: 'text' });

module.exports = mongoose.model('Product', ProductSchema);