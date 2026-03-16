const UserModel = require('../models/userModel')

exports.getCurrentUser = async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId)

        if (!user) return res.status(404).json({ message: 'User not found !' })

        res.json(user)
    } catch (error) {
        console.log('get current user error : ', error)
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

exports.getAllUsers = async (req, res) => {
    try {
        const users = await UserModel.find({})
        const total = await UserModel.countDocuments()
        res.json({
            users,
            total
        })
    } catch (error) {
        console.log('get all users error : ', error)
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}