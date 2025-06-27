const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Middleware to check if user is verified
const verificationMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization');
    
    if (!token || !token.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Extract token (remove 'Bearer ' prefix)
    const actualToken = token.slice(7);

    // Verify token
    const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
    
    // Get user from database to check current verification status
    const [users] = await db.query(
      'SELECT user_id, verification_status, user_type FROM users WHERE user_id = ?',
      [decoded.user.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = users[0];

    // Check if user is verified
    if (user.verification_status === 'pending') {
      return res.status(403).json({ 
        message: 'Account pending verification. Please wait for admin approval.',
        verification_status: 'pending'
      });
    }

    // Add user info to request object
    req.user = {
      id: user.user_id,
      user_type: user.user_type,
      verification_status: user.verification_status
    };

    next();
  } catch (error) {
    console.error('Verification middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    return res.status(500).json({ message: 'Server error during verification check' });
  }
};

module.exports = verificationMiddleware;
