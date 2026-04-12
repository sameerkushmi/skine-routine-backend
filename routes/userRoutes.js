const express = require('express')
const {
    getCurrentUser,
    getAllUsers,
    updateUser,
    deleteUser,
    createUser,
    addAddress,
    getAddresses,
    updatedAddress,
    deleteAddress,
    changePassword
} = require('../controllers/userController')
const protect = require('../middlewares/protect')
const adminProtect = require('../middlewares/adminProtect')
const upload = require('../middlewares/upload')

const router = express.Router()

// get current logged in user
router.get('/get-me', protect, getCurrentUser)
// update logged in user profile
router.put('/update', protect, upload.single('avatar'), updateUser)

// addresses routes
router.post('/add/address', protect, addAddress)
router.get('/get-all/addresses', protect, getAddresses)

router.put('/change/password', protect, changePassword)

router.post('/create', protect, adminProtect, upload.single('avatar'), createUser)
router.get('/get-all', protect, adminProtect, getAllUsers)
router.put('/update/address/:index', protect, updatedAddress)
router.delete('/delete/address/:index', protect, deleteAddress)
router.delete('/delete/:id', protect, adminProtect, deleteUser)

module.exports = router