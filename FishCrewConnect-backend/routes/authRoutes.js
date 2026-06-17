const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { checkUserRegistrationEnabled } = require('../middleware/settingsMiddleware');
const { authLimiter, generalAuthLimiter } = require('../middleware/rateLimitMiddleware');

// @route   POST api/auth/signup
// @desc    Register a new user
// @access  Public (but subject to registration settings)
router.post('/signup', generalAuthLimiter, checkUserRegistrationEnabled, authController.signup);

// @route   POST api/auth/signin
// @desc    Authenticate user & get token (Sign In)
// @access  Public
router.post('/signin', authLimiter, authController.signin);

// @route   POST api/auth/refresh
// @desc    Refresh an expired JWT token
// @access  Public (with expired token)
router.post('/refresh', authLimiter, authController.refreshToken);

// @route   POST api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', authLimiter, authController.forgotPassword);

// @route   POST api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', authLimiter, authController.resetPassword);

// @route   POST api/auth/reset-password-direct
// @desc    Reset password directly with email (requires verified OTP)
// @access  Public
router.post('/reset-password-direct', authLimiter, authController.resetPasswordDirect);

// @route   POST api/auth/check-email
// @desc    Check if email exists in the system
// @access  Public
router.post('/check-email', generalAuthLimiter, authController.checkEmail);

// @route   POST api/auth/send-otp
// @desc    Send OTP for password reset verification
// @access  Public
router.post('/send-otp', authLimiter, authController.sendOTP);

// @route   POST api/auth/verify-otp
// @desc    Verify OTP for password reset
// @access  Public
router.post('/verify-otp', authLimiter, authController.verifyOTP);

// ---- START DIAGNOSTIC ROUTE in authRoutes.js ----
router.get('/ping', (req, res) => {
  console.log('Accessed /api/auth/ping in authRoutes.js');
  res.status(200).send('Pong from /api/auth/ping in authRoutes.js');
});
// ---- END DIAGNOSTIC ROUTE ----

module.exports = router;
