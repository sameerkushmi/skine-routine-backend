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
        console.log("protect middleware error:",error)
        return res.status(401).json({
            message: "Invalid or expired access token"
        })
    }
}

module.exports = protect