
// routes/wishlistRoutes.js
const express = require('express')
const { addToWishlist, clearWishlist, getWishlist, removeFromWishlist } = require('../controllers/wishlistController')
const protect = require('../middlewares/protect')

const router = express.Router();

router.post("/add", protect, addToWishlist);
router.get("/", protect, getWishlist);
router.delete("/:productId", protect, removeFromWishlist);
router.delete("/clear/all", protect, clearWishlist);

module.exports = router;