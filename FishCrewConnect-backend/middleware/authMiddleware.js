const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

module.exports = async function(req, res, next) {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ message: 'Token is not in Bearer format' });
    }

    const token = parts[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // If the token carries a JTI, check it hasn't been revoked
        if (decoded.jti) {
            const [rows] = await db.query(
                'SELECT 1 FROM token_blacklist WHERE jti = ? AND expires_at > NOW() LIMIT 1',
                [decoded.jti]
            );
            if (rows.length > 0) {
                return res.status(401).json({ message: 'Token has been revoked. Please sign in again.' });
            }
        }

        req.user = decoded.user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token is not valid (expired)' });
        }
        res.status(401).json({ message: 'Token is not valid' });
    }
};
