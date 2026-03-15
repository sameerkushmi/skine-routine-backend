const Product = require("../models/productModel");
const cloudinary = require("../config/cloudinary");
const slugify = require("slugify");


// CREATE PRODUCT
exports.createProduct = async (req, res) => {
    try {

        const {
            name,
            brand,
            description,
            category,
            price,
            oldPrice,
            stock,
            sku,
            tags,
            ingredients,
            additionalInfo
        } = req.body;

        const images = req.files.map((file) => ({
            url: file.path,
            public_id: file.filename
        }));

        const product = await Product.create({
            name,
            brand,
            slug: slugify(name, { lower: true }),
            description,
            category,
            price,
            oldPrice,
            stock,
            sku,
            tags,
            ingredients,
            additionalInfo,
            images
        });

        res.status(201).json({
            success: true,
            product
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
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



// GET SINGLE PRODUCT
exports.getProduct = async (req, res) => {
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



// UPDATE PRODUCT
exports.updateProduct = async (req, res) => {
    try {

        let product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // delete old images if new uploaded
        if (req.files && req.files.length > 0) {

            for (let img of product.images) {
                await cloudinary.uploader.destroy(img.public_id);
            }

            const images = req.files.map((file) => ({
                url: file.path,
                public_id: file.filename
            }));

            req.body.images = images;
        }

        if (req.body.name) {
            req.body.slug = slugify(req.body.name, { lower: true });
        }

        product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        res.status(200).json({
            success: true,
            product
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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