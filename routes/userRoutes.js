const express = require('express')
const { getCurrentUser, getAllUsers, updateUser, deleteUser, createUser } = require('../controllers/userController')
const protect = require('../middlewares/protect')
const adminProtect = require('../middlewares/adminProtect')
const upload = require('../middlewares/upload')

const router = express.Router()

router.get('/get-me', protect, getCurrentUser)
router.put('/update/:id',upload.single('avatar'), updateUser)

router.use(protect, adminProtect);

router.post('/create', upload.single('avatar'), createUser)
router.get('/get-all', getAllUsers)
router.delete('/delete/:id', deleteUser)

module.exports = router