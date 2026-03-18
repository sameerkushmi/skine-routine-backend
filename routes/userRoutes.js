const express = require('express')
const { getCurrentUser, getAllUsers, updateUser, deleteUser } = require('../controllers/userController')
const protect = require('../middlewares/protect')
const adminProtect = require('../middlewares/adminProtect')

const router = express.Router()

router.get('/get-me', protect, getCurrentUser)

router.use(protect, adminProtect);

router.get('/get-all', getAllUsers)
router.put('/update/:id', updateUser)
router.delete('/delete/:id', deleteUser)

module.exports = router