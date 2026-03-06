const jwt = require('jsonwebtoken')

const protect = (req, res, next) => {
    try {
        const { accessToken } = req.cookies

        if (!accessToken) 
            return res.status(401).json({ message: 'No token, authorization denied' })

        const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
        req.userId = decoded.id;
        next();

    } catch (error) {
        console.log("protect middleware erro : ", error)
        res.status(500).json({
            message: error.message
        })
    }
}

module.exports = protect