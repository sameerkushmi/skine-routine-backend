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
    getPaymentAnalytics,
    createFonepayOrder,
    verifyFonepayPayment
} = require('../controllers/orderController')

const router = express.Router()

const protect = require('../middlewares/protect')
const adminProtect = require('../middlewares/adminProtect')


router.use(protect)
router.get('/my', getOrders) // Get orders of logged in user
router.get('/single/:id', getSingleOrder) // Get single order of logged in user, also admin can access any order details
router.post('/cod', createCODOrder) // Create order with Cash on Delivery payment method
router.post('/esewa', createEsewaOrder) // Create order with eSewa payment method, it will return the order details along with the URL to redirect for payment
router.post('/esewa/verify', verifyEsewaPayment) // Verify eSewa payment after the user is redirected back to the site, it will update the order status to 'paid' if the payment is successful
router.post('/khalti', createKhaltiOrder) // Create order with Khalti payment method, it will return the order details along with the URL to redirect for payment
router.post('/khalti/verify', verifyKhaltiPayment) // Verify Khalti payment after the user is redirected back to the site, it will update the order status to 'paid' if the payment is successful
router.post('/fonepay', createFonepayOrder) // Create order with Fonepay payment method, it will return the order details along with the URL to redirect for payment
router.post('/fonepay/verify', verifyFonepayPayment) // Verify Fonepay payment after the user is redirected back to the site, it will update the order status to 'paid' if the payment is successful

router.use(adminProtect)
router.get('/get-all', getAllOrders) // Get all orders, only admin can access this route, it will return all orders with pagination and sorting options
router.patch("/:id/status", updateOrderStatus); // Update order status, only admin can update the order status, it will also update the product stock if the order is marked as 'delivered'
router.get("/total-revenue", getCompletedPaymentTotal) // Get total revenue from completed payments, only admin can access this route
router.get("/analytics", getPaymentAnalytics) // Get payment analytics, only admin can access this route, it will return the total revenue, total orders, total products sold, and total customers in the last 30 days

module.exports = router