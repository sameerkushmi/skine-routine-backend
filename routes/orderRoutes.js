const express = require('express')
const { createEsewaOrder, createCODOrder } = require('../controllers/orderController')

const router = express.Router()

const protect = require('../middlewares/protect')

router.use(protect)
router.post('/cod', createCODOrder)
router.post('/esewa', createEsewaOrder)

module.exports = router