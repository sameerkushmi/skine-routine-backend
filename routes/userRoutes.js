const express = require('express')
const { getCurrentUser, getAllUsers } = require('../controllers/userController')
const protect = require('../middlewares/protect')

const router = express.Router()

router.get('/get-me', protect, getCurrentUser)
router.get('/all', getAllUsers)

module.exports = router