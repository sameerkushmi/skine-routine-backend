const express = require('express')
const { createEsewaOrder, createCODOrder, getOrders, getAllOrders, getSingleOrder, verifyEsewaPayment,  } = require('../controllers/orderController')

const router = express.Router()

const protect = require('../middlewares/protect')

router.get('/get-all', getAllOrders)

router.use(protect)
router.get('/my', getOrders)
router.get('/single/:id', getSingleOrder)
router.post('/cod', createCODOrder)
router.post('/esewa', createEsewaOrder)
router.post('/esewa/verify', verifyEsewaPayment)

module.exports = router