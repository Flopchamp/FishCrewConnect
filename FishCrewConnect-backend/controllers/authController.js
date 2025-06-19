const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // MySQL connection pool
require('dotenv').config(); // To access JWT_SECRET from .env

// Signup controller
exports.signup = async (req, res) => {
    const { name, email, password, user_type, contact_number, organization_name } = req.body;

    // Basic validation
    if (!name || !email || !password || !user_type) {
        return res.status(400).json({ message: 'Please provide name, email, password, and user type.' });
    }    // Validate user_type against allowed enum values
    const allowedUserTypes = ['boat_owner', 'fisherman', 'admin'];
    if (!allowedUserTypes.includes(user_type)) {
        return res.status(400).json({ message: 'Invalid user type specified.' });
    }

    try {
        // Check if email already exists
        const [users] = await db.query('SELECT email FROM users WHERE email = ?', [email]);
        if (users.length > 0) {
            return res.status(409).json({ message: 'Email already in use.' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insert new user
        // Note: firebase_uid is not handled here yet, will be null by default as per schema
        const newUser = {
            name,
            email,
            password_hash,
            user_type,
            contact_number: contact_number || null,
            organization_name: organization_name || null
        };

        const [result] = await db.query('INSERT INTO users SET ?', newUser);

        // Respond with success (excluding password_hash)
        res.status(201).json({
            message: 'User registered successfully!',
            userId: result.insertId,
            name,
            email,
            user_type
        });

    } catch (error) {
        console.error('Signup error:', error);
        // Check for specific MySQL errors if needed, e.g., error.code === 'ER_DUP_ENTRY'
        res.status(500).json({ message: 'Server error during registration.' });
    }
};

// Signin controller
exports.signin = async (req, res) => {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // Check if user exists
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const user = rows[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // User matched, create JWT payload
        const payload = {
            user: {
                id: user.user_id,
                email: user.email,
                user_type: user.user_type,
                name: user.name
            }
        };

        // Sign the token
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' }, // Token expires in 1 hour, adjust as needed
            (err, token) => {
                if (err) throw err;
                res.json({ 
                    token,
                    user: {
                        id: user.user_id,
                        email: user.email,
                        name: user.name,
                        user_type: user.user_type,
                        contact_number: user.contact_number,
                        organization_name: user.organization_name
                    }
                });
            }
        );

    } catch (err) {
        console.error('Error during sign-in:', err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Refresh JWT token
// @route   POST /api/auth/refresh
// @access  Public (with expired token)
exports.refreshToken = async (req, res) => {
    try {
        // Get the expired token from header
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            return res.status(401).json({ message: 'No token provided' });
        }

        // Check if token is in Bearer format
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({ message: 'Token is not in Bearer format' });
        }

        const oldToken = parts[1];
        
        // Try to decode the token without verification to get the payload
        let decodedToken;
        try {
            // This will work even with an expired token as we're not verifying
            decodedToken = jwt.decode(oldToken);
            
            if (!decodedToken || !decodedToken.user || !decodedToken.user.id) {
                return res.status(401).json({ message: 'Invalid token format' });
            }
            
            // Get the user ID from the decoded token
            const userId = decodedToken.user.id;
            
            // Find the user in the database to confirm they still exist
            const [users] = await db.query(
                'SELECT user_id, user_type, email, name FROM users WHERE user_id = ?',
                [userId]
            );
            
            if (users.length === 0) {
                return res.status(401).json({ message: 'User not found' });
            }
            
            const user = users[0];
            
            // Generate a new token
            const payload = {
                user: {
                    id: user.user_id,
                    email: user.email,
                    user_type: user.user_type
                }
            };
            
            const newToken = jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '8h' }  // Extended token expiration
            );
            
            // Return the new token
            return res.json({
                token: newToken,
                user: {
                    user_id: user.user_id,
                    email: user.email,
                    name: user.name,
                    user_type: user.user_type
                }
            });
            
        } catch (error) {
            console.error('Error decoding token:', error);
            return res.status(401).json({ message: 'Invalid token' });
        }
    } catch (error) {
        console.error('Error in refreshToken:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// updateUserProfile controller
