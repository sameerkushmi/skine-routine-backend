const Product = require("../models/productModel");
const cloudinary = require("../config/cloudinary");
const slugify = require("slugify");
const { nanoid } = require('nanoid')

// ===== CREATE PRODUCT =====
exports.createProduct = async (req, res) => {
    try {
        const {
            name,
            brand,
            description,
            shortDescription,
            category,
            price,
            oldPrice,
            stock,
            sku,
            additionalInfo,
            featured,
            isActive,
        } = req.body;

        // Validate required fields
        if (!name || !brand || !description || !shortDescription || !category || !price) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: name, brand, description, shortDescription, category, price',
            });
        }
        // Handle images uploaded via multer + Cloudinary
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one product image is required.' });
        }
        const images = req.files.map((file) => ({
            url: file.path,
            public_id: file.filename,
        }));

        // Helper to parse JSON string arrays
        const parseJSONField = (field) => {
            if (!field) return [];
            if (typeof field === 'string') {
                try {
                    return JSON.parse(field);
                } catch {
                    return [];
                }
            }
            return Array.isArray(field) ? field : [];
        };

        const usage = parseJSONField(req.body.usage);
        const ingredients = parseJSONField(req.body.ingredients);
        const skinType = parseJSONField(req.body.skinType);

        // Create product
        const product = await Product.create({
            name,
            brand,
            slug: slugify(name, { lower: true }),
            description,
            shortDescription,
            category,
            skinType,
            price: Number(price),
            oldPrice: Number(oldPrice),
            stock: Number(stock),
            sku: sku || `SKU-${nanoid(8)}`,
            additionalInfo: additionalInfo || '',
            featured: featured || false,
            isActive: isActive !== undefined ? isActive : true,
            images,
            usage,
            ingredients,
        });

        return res.status(201).json({ success: true, product });
    } catch (error) {
        console.error('Create Product Error:', error);
        return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// GET ALL PRODUCTS
exports.getProducts = async (req, res) => {
    try {

        const page = Number(req.query.page) || 1;
        const limit = 10;

        const products = await Product.find({ isActive: true })
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Product.countDocuments();

        res.status(200).json({
            success: true,
            total,
            page,
            products
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET SINGLE BY SLUG PRODUCT
exports.getBySlugProduct = async (req, res) => {
    try {

        const product = await Product.findOne({
            slug: req.params.slug
        }).populate("reviews.user", "name");

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.status(200).json({
            success: true,
            product
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET SINGLE BY ID PRODUCT
exports.getByIdProduct = async (req, res) => {
    try {

        const product = await Product.findById(req.params.id)

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.status(200).json({
            success: true,
            product
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // Find product
        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        // Handle images
        if (req.files && req.files.length > 0) {
            // Delete old images from Cloudinary
            for (const img of product.images) {
                await cloudinary.uploader.destroy(img.public_id);
            }
            product.images = req.files.map((file) => ({
                url: file.path,
                public_id: file.filename,
            }));
        }

        // Helper function to safely parse arrays sent as JSON strings
        const parseJSONField = (field, fallback) => {
            if (!field) return fallback;
            if (typeof field === 'string') {
                if (field === '[object Object]' || field.includes('[object Object]')) return fallback;
                try {
                    const parsed = JSON.parse(field);
                    return Array.isArray(parsed) ? parsed : fallback;
                } catch {
                    return fallback;
                }
            }
            return Array.isArray(field) ? field : fallback;
        };

        // Update fields
        product.name = req.body.name || product.name;
        product.brand = req.body.brand || product.brand;
        product.description = req.body.description || product.description;
        product.shortDescription = req.body.shortDescription || product.shortDescription;
        product.category = req.body.category || product.category;
        product.price = req.body.price || product.price;
        product.oldPrice = req.body.oldPrice !== undefined ? req.body.oldPrice : product.oldPrice;
        product.stock = req.body.stock !== undefined ? req.body.stock : product.stock;
        product.sku = req.body.sku || product.sku;
        product.additionalInfo = req.body.additionalInfo || product.additionalInfo;
        product.featured = req.body.featured !== undefined ? req.body.featured : product.featured;
        product.isActive = req.body.isActive !== undefined ? req.body.isActive : product.isActive;

        // Safely parse arrays
        product.usage = parseJSONField(req.body.usage, product.usage);
        product.ingredients = parseJSONField(req.body.ingredients, product.ingredients);
        product.skinType = parseJSONField(req.body.skinType, product.skinType);

        await product.save();

        return res.status(200).json({ success: true, product });
    } catch (error) {
        console.error('Update Product Error:', error);
        return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// DELETE PRODUCT
exports.deleteProduct = async (req, res) => {
    try {

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        for (let img of product.images) {
            await cloudinary.uploader.destroy(img.public_id);
        }

        await product.deleteOne();

        res.status(200).json({
            success: true,
            message: "Product deleted"
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ADD REVIEW
exports.addReview = async (req, res) => {
    try {

        const { rating, comment } = req.body;

        const product = await Product.findById(req.params.id);

        const review = {
            user: req.user._id,
            rating: Number(rating),
            comment
        };

        const isReviewed = product.reviews.find(
            r => r.user.toString() === req.user._id.toString()
        );

        if (isReviewed) {
            isReviewed.rating = rating;
            isReviewed.comment = comment;
        } else {
            product.reviews.push(review);
        }

        product.numReviews = product.reviews.length;

        product.rating =
            product.reviews.reduce((acc, item) => acc + item.rating, 0) /
            product.reviews.length;

        await product.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};