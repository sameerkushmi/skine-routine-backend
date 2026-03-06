const UserModel = require('../models/userModel')

const adminProtect = (req, res, next) => {
    try {
        const user = UserModel.findById(req.userId)
        if (!user) 
            return res.status(404).json({ success: false, message: 'User Not Found !' })

        if (user.role !== 'admin') 
            return res.status(401).json({ message: 'Unauthorized' })

        next()
    } catch (error) {
        console.log("admin protect error", error)
        res.status(500).json({
            message: error.message
        })
    }
}

module.exports = adminProtect