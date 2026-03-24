
// routes/wishlistRoutes.js
const express = require('express')
const { addToWishlist, clearWishlist, getWishlist, removeFromWishlist } = require('../controllers/wishlistController')
const protect = require('../middlewares/protect')

const router = express.Router();

router.use(protect);

router.post("/add", addToWishlist);
router.get("/", getWishlist);
router.delete("/:productId", removeFromWishlist);
router.delete("/clear/all", clearWishlist);

module.exports = router;