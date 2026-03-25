const express = require('express')
const { createAndUpdate, deleteReview, getReviewsByProduct, createReview, updateReview } = require('../controllers/reviewController')
const protect = require('../middlewares/protect')

const router = express.Router()

router.get('/product/:productId', getReviewsByProduct)

router.use(protect)
router.post('/create/:productId', createReview)
router.put('/update/:reviewId', updateReview)
router.delete('/delete/:reviewId', deleteReview)

module.exports = router