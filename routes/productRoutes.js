const express = require("express");
const router = express.Router();

const { createProduct, getProducts, getProduct, updateProduct, deleteProduct, addReview, getBySlugProduct, getByIdProduct } = require("../controllers/productController");
const upload = require("../middlewares/upload");
const protect = require('../middlewares/protect')
const adminProtect = require('../middlewares/adminProtect')

router.post(
    "/create",
    upload.array("images", 5),
    protect,
    adminProtect,
    createProduct
);

router.get("/get-all", getProducts);

router.get("/get-by-slug/:slug", getBySlugProduct);
router.get("/get-by-id/:id", getByIdProduct);

router.put(
    "/:id",
    upload.array("images", 5),
    protect,
    adminProtect,
    updateProduct
);

router.delete("/:id",
    protect,
    adminProtect,
    deleteProduct
);

router.post("/review/:id", protect, addReview);

module.exports = router;