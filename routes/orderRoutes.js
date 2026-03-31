const express = require('express')
const {
    createEsewaOrder,
    createCODOrder,
    getOrders,
    getAllOrders,
    getSingleOrder,
    verifyEsewaPayment,
    updateOrderStatus,
    getCompletedPaymentTotal,
    createKhaltiOrder,
    verifyKhaltiPayment,
    getPaymentAnalytics
} = require('../controllers/orderController')

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
router.post('/khalti', createKhaltiOrder) // This route is added for Khalti payment initiation
router.post('/khalti/verify', verifyKhaltiPayment) // This route is added for Khalti payment verification

router.use(adminProtect)
router.patch("/:id/status", updateOrderStatus);
router.get("/total-revenue", getCompletedPaymentTotal)
router.get("/analytics", getPaymentAnalytics) // This route is added for fetching analytics data

module.exports = router