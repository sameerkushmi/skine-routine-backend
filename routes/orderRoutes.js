const express = require('express')
const { createEsewaOrder, createCODOrder, getOrders, getAllOrders, getSingleOrder, verifyEsewaPayment, updateOrderStatus, getCompletedPaymentTotal, } = require('../controllers/orderController')

const router = express.Router()

const protect = require('../middlewares/protect')
const adminProtect = require('../middlewares/adminProtect')

router.get('/get-all', getAllOrders)

router.use(protect)
router.get('/my', getOrders)
router.get('/single/:id', getSingleOrder)
router.post('/cod', createCODOrder)
router.post('/esewa', createEsewaOrder)
router.post('/esewa/verify', verifyEsewaPayment)

router.use(adminProtect)
router.patch("/:id/status", updateOrderStatus);
router.get("/total-revenue", getCompletedPaymentTotal)

module.exports = router