const UserModel = require('../models/userModel')

exports.getCurrentUser = async (req,res) => {
    try {
        const user = await UserModel.findById(req.userId)

        if(!user) return res.status(404).json({message: 'User not found !'})

        res.json(user)
    } catch (error) {
        console.log('get current user error : ' , error)
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}