const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db'); // MySQL connection pool
const emailService = require('../services/emailService'); // Email service
require('dotenv').config(); // To access JWT_SECRET from .env

// Signup controller
exports.signup = async (req, res) => {
    const { name, email, password, user_type, contact_number, organization_name } = req.body;

    // Basic validation
    if (!name || !email || !password || !user_type) {
        return res.status(400).json({ message: 'Please provide name, email, password, and user type.' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    
    // Validate password strength
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }    // Validate user_type against allowed enum values
    const allowedUserTypes = ['boat_owner', 'fisherman', 'admin'];
    if (!allowedUserTypes.includes(user_type)) {
        return res.status(400).json({ message: 'Invalid user type specified.' });
    }
    
    // Validate contact_number if provided (should only contain digits)
    if (contact_number !== undefined && contact_number !== null && contact_number !== '') {
        const contactStr = contact_number.toString().trim();
        if (contactStr && !/^\d+$/.test(contactStr)) {
            return res.status(400).json({ message: 'Contact number should only contain digits.' });
        }
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

        // Insert new user with verification status
        // Note: firebase_uid is not handled here yet, will be null by default as per schema
        const newUser = {
            name,
            email,
            password_hash,
            user_type,
            contact_number: contact_number || null,
            organization_name: organization_name || null,
            verification_status: user_type === 'admin' ? 'verified' : 'pending' // Auto-verify admins
        };

        const [result] = await db.query('INSERT INTO users SET ?', newUser);

        // Create verification request for non-admin users
        if (user_type !== 'admin') {
            await db.query(
                'INSERT INTO user_verification_requests (user_id, request_type) VALUES (?, ?)',
                [result.insertId, 'registration']
            );
        }

        // Respond with success (excluding password_hash)
        const responseMessage = user_type === 'admin' 
            ? 'Admin account created and verified successfully!'
            : 'Account created successfully! Your account is pending admin verification.';

        res.status(201).json({
            message: responseMessage,
            userId: result.insertId,
            name,
            email,
            user_type,
            verification_status: user_type === 'admin' ? 'verified' : 'pending'
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
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
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

        // Check verification status
        if (user.verification_status === 'pending') {
            return res.status(403).json({ 
                message: 'Your account is pending admin verification. Please wait for approval.',
                verification_status: 'pending'
            });
        }

        // User matched and verified, create JWT payload
        const payload = {
            user: {
                id: user.user_id,
                email: user.email,
                user_type: user.user_type,
                name: user.name,
                verification_status: user.verification_status
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
                        organization_name: user.organization_name,
                        verification_status: user.verification_status
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

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    // Basic validation
    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    try {
        // Check if user exists
        const [users] = await db.query('SELECT user_id, email, name FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            // For security, don't reveal if email exists or not
            return res.status(200).json({ 
                message: 'If an account with that email exists, a password reset link has been sent.' 
            });
        }

        const user = users[0];

        // Generate a secure reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

        // Store the reset token in database
        await db.query(
            'INSERT INTO password_resets (user_id, reset_token, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reset_token = ?, expires_at = ?',
            [user.user_id, resetToken, resetTokenExpiry, resetToken, resetTokenExpiry]
        );

        // Send password reset email
        try {
            const emailSent = await emailService.sendPasswordResetEmail(
                user.email,
                user.name,
                resetToken
            );

            if (emailSent) {
                console.log(`✅ Password reset email sent to ${email}`);
            } else {
                console.log(`❌ Failed to send password reset email to ${email}`);
            }
        } catch (emailError) {
            console.error('Email service error:', emailError);
        }

        // Always return success message for security (don't reveal if email failed to send)
        res.status(200).json({ 
            message: 'If an account with that email exists, a password reset link has been sent to your email address. Please check your inbox and spam folder.'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error during password reset request.' });
    }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    // Basic validation
    if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required.' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    try {
        // Find valid reset token
        const [resetRequests] = await db.query(
            'SELECT pr.user_id, pr.expires_at, u.email FROM password_resets pr JOIN users u ON pr.user_id = u.user_id WHERE pr.reset_token = ? AND pr.expires_at > NOW()',
            [token]
        );

        if (resetRequests.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired reset token.' });
        }

        const resetRequest = resetRequests[0];

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user password
        await db.query(
            'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE user_id = ?',
            [hashedPassword, resetRequest.user_id]
        );

        // Remove the used reset token
        await db.query('DELETE FROM password_resets WHERE user_id = ?', [resetRequest.user_id]);

        res.status(200).json({ message: 'Password has been reset successfully. You can now sign in with your new password.' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error during password reset.' });
    }
};

// @desc    Check if email exists
// @route   POST /api/auth/check-email
// @access  Public
exports.checkEmail = async (req, res) => {
    const { email } = req.body;

    // Basic validation
    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    try {
        // Check if user exists
        const [users] = await db.query('SELECT user_id, email, name FROM users WHERE email = ?', [email]);
        
        if (users.length > 0) {
            // Email exists
            res.status(200).json({ 
                exists: true,
                message: 'Email found in our system.',
                user: {
                    email: users[0].email,
                    name: users[0].name
                }
            });
        } else {
            // Email doesn't exist
            res.status(200).json({ 
                exists: false,
                message: 'No account found with this email address.'
            });
        }

    } catch (error) {
        console.error('Check email error:', error);
        res.status(500).json({ message: 'Server error during email verification.' });
    }
};

// @desc    Reset password directly with email (no token)
// @route   POST /api/auth/reset-password-direct
// @access  Public
exports.resetPasswordDirect = async (req, res) => {
    const { email, newPassword } = req.body;

    // Basic validation
    if (!email || !newPassword) {
        return res.status(400).json({ message: 'Email and new password are required.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    try {
        // Check if user exists
        const [users] = await db.query('SELECT user_id, email FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found with this email address.' });
        }

        const user = users[0];

        // Hash the new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update the password in database
        await db.query(
            'UPDATE users SET password_hash = ? WHERE user_id = ?',
            [hashedPassword, user.user_id]
        );

        // Clean up any existing password reset tokens for this user
        await db.query('DELETE FROM password_resets WHERE user_id = ?', [user.user_id]);

        console.log(`✅ Password successfully reset for user ${email}`);

        res.status(200).json({ 
            message: 'Password has been successfully reset. You can now sign in with your new password.'
        });

    } catch (error) {
        console.error('Reset password direct error:', error);
        res.status(500).json({ message: 'Server error during password reset.' });
    }
};

// @desc    Send OTP for password reset
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendOTP = async (req, res) => {
    const { email } = req.body;

    // Basic validation
    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    try {
        // Check if user exists
        const [users] = await db.query('SELECT user_id, email, name FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(404).json({ message: 'No account found with this email address.' });
        }

        const user = users[0];

        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

        // Store OTP in database (replace any existing OTP for this email)
        await db.query(
            'INSERT INTO otp_verifications (email, otp_code, expires_at, verified) VALUES (?, ?, ?, false) ON DUPLICATE KEY UPDATE otp_code = ?, expires_at = ?, verified = false',
            [email, otpCode, expiresAt, otpCode, expiresAt]
        );

        // Send OTP via email
        try {
            const emailService = require('../services/emailService');
            const emailSent = await emailService.sendOTPEmail(email, user.name, otpCode);

            if (emailSent) {
                console.log(`✅ OTP sent successfully to ${email}`);
            } else {
                console.log(`❌ Failed to send OTP to ${email}`);
            }
        } catch (emailError) {
            console.error('OTP email service error:', emailError);
        }

        res.status(200).json({ 
            success: true,
            message: 'OTP has been sent to your email address. Please check your inbox.',
            email: email
        });

    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ message: 'Server error during OTP generation.' });
    }
};

// @desc    Verify OTP for password reset
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    // Basic validation
    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
        return res.status(400).json({ message: 'OTP must be a 6-digit number.' });
    }

    try {
        // Find valid OTP record
        const [otpRecords] = await db.query(
            'SELECT * FROM otp_verifications WHERE email = ? AND otp_code = ? AND expires_at > NOW() AND verified = false',
            [email, otp]
        );

        if (otpRecords.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new one.' });
        }

        // Mark OTP as verified
        await db.query(
            'UPDATE otp_verifications SET verified = true WHERE email = ? AND otp_code = ?',
            [email, otp]
        );

        console.log(`✅ OTP verified successfully for ${email}`);

        res.status(200).json({ 
            success: true,
            message: 'OTP verified successfully. You can now reset your password.',
            verified: true,
            email: email
        });

    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ message: 'Server error during OTP verification.' });
    }
};
