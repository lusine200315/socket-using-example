const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_jwt_secret_key';


const authenticateJWT = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        return res.status(403).json({ success: false, msg: 'Access denied. No token provided.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, msg: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

module.exports = {
    authenticateJWT
}