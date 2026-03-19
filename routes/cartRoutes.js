
const express = require('express')
const {
    addToCart,
    clearCart,
    getCart,
    removeCartItem,
    updateCartItem
} = require('../controllers/cartController.js')

const protect = require('../middlewares/protect.js')

const router = express.Router();

router.post("/add", protect, addToCart);
router.get("/get-all", protect, getCart);
router.put("/update", protect, updateCartItem);
router.delete("/remove/:productId", protect, removeCartItem);
router.delete("/clear", protect, clearCart);

module.exports = router;