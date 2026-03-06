const express = require('express')
const { register, login, logout, verifyEmail, refreshToken } = require('../controllers/authController')

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.post('/logout', logout)
router.get("/verify-email", verifyEmail);
router.post('/refresh', refreshToken)

module.exports = router