const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// @route   POST api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', authController.signup);

// @route   POST api/auth/signin
// @desc    Authenticate user & get token (Sign In)
// @access  Public
router.post('/signin', authController.signin);

// @route   POST api/auth/refresh
// @desc    Refresh an expired JWT token
// @access  Public (with expired token)
router.post('/refresh', authController.refreshToken);

// ---- START DIAGNOSTIC ROUTE in authRoutes.js ----
router.get('/ping', (req, res) => {
  console.log('Accessed /api/auth/ping in authRoutes.js');
  res.status(200).send('Pong from /api/auth/ping in authRoutes.js');
});
// ---- END DIAGNOSTIC ROUTE ----

module.exports = router;
