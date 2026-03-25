const express = require('express')
const { createAndUpdate, deleteReview, getReviewsByProduct } = require('../controllers/reviewController')
const protect = require('../middlewares/protect')

const router = express.Router()

router.post('/create/:productId', protect, createAndUpdate)
router.delete('/delete/:reviewId', protect, deleteReview)
router.get('/product/:productId', getReviewsByProduct)

module.exports = router