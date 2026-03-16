const express = require("express");
const router = express.Router();

const {
    createProduct,
    getProducts,
    updateProduct,
    deleteProduct,
    getBySlugProduct,
    getByIdProduct,
    getFeaturedProducts,
    getProductSlugs
} = require("../controllers/productController");
const upload = require("../middlewares/upload");
const protect = require('../middlewares/protect')
const adminProtect = require('../middlewares/adminProtect')

// user routes
router.get("/get-all", getProducts);

router.get("/get-by-slug/:slug", getBySlugProduct);

router.get("/slug", getProductSlugs);

router.get('/get-featured', getFeaturedProducts)

// admin routes
router.use(protect, adminProtect);

router.post(
    "/create",
    upload.array("images", 5),
    createProduct
);

router.get("/get-by-id/:id",
    getByIdProduct);

router.put(
    "/:id",
    upload.array("images", 5),
    updateProduct
);

router.delete("/:id",
    deleteProduct
);

module.exports = router;