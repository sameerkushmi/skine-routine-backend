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
    deleteAddress
} = require('../controllers/userController')
const protect = require('../middlewares/protect')
const adminProtect = require('../middlewares/adminProtect')
const upload = require('../middlewares/upload')

const router = express.Router()

router.get('/get-me', protect, getCurrentUser)
router.put('/update/:id', protect, upload.single('avatar'), updateUser)
router.post('/add/address', protect, addAddress)
router.get('/get-all/addresses', protect, getAddresses)
router.put('/update/address/:index', protect, updatedAddress)
router.delete('/delete/address/:index', protect, deleteAddress)

router.use(protect, adminProtect);

router.post('/create', upload.single('avatar'), createUser)
router.get('/get-all', getAllUsers)
router.delete('/delete/:id', deleteUser)

module.exports = router