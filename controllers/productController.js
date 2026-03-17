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
        const concerns = parseJSONField(req.body.concerns);

        // Create product
        const product = await Product.create({
            name,
            brand,
            slug: slugify(name, { lower: true }),
            description,
            shortDescription,
            category,
            skinType,
            concerns,
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

        let { page = 1, limit = 5, search = "" } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        // Build search query
        const query = search
            ? { name: { $regex: search, $options: "i" } } // case-insensitive search
            : {};

        const total = await Product.countDocuments(query);
        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json({
            products,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET ALL PRODUCT SLUGS
exports.getProductSlugs = async (req, res) => {
    try {

        const products = await Product.find(
            { isActive: true },
            { slug: 1, _id: 0 }
        )

        res.status(200).json({
            success: true,
            products
        })

    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

// GET SINGLE BY SLUG PRODUCT
exports.getBySlugProduct = async (req, res) => {
    try {

        const product = await Product.findOne({
            slug: req.params.slug
        })

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
        product.concerns = parseJSONField(req.body.concerns, product.concerns);

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

// GET FEATURED PRODUCTS
exports.getFeaturedProducts = async (req, res) => {
    try {

        const products = await Product.find({ featured: true, isActive: true }).limit(8);

        res.status(200).json({
            success: true,
            products
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}