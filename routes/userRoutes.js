const express = require('express')
const { getCurrentUser } = require('../controllers/userController')
const protect = require('../middlewares/protect')

const router = express.Router()

router.get('/get-me', protect, getCurrentUser)

module.exports = router