const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/payments/initiate-job-payment
// @desc    Initiate payment from boat owner to fisherman
// @access  Private (Boat owners only)
router.post('/initiate-job-payment', authMiddleware, paymentController.initiateJobPayment);

// @route   GET /api/payments/status/:paymentId
// @desc    Get payment status
// @access  Private
router.get('/status/:paymentId', authMiddleware, paymentController.getPaymentStatus);

// @route   GET /api/payments/history
// @desc    Get payment history for user
// @access  Private
router.get('/history', authMiddleware, paymentController.getPaymentHistory);

// M-Pesa callback routes (public - no auth middleware)
// @route   POST /api/payments/daraja/callback
// @desc    Handle M-Pesa STK Push callback
// @access  Public (M-Pesa callback)
router.post('/daraja/callback', paymentController.handleMpesaCallback);

// @route   POST /api/payments/daraja/result
// @desc    Handle M-Pesa B2C result callback
// @access  Public (M-Pesa callback)
router.post('/daraja/result', paymentController.handleB2CResult);

// @route   POST /api/payments/daraja/timeout
// @desc    Handle M-Pesa timeout callback
// @access  Public (M-Pesa callback)
router.post('/daraja/timeout', paymentController.handleTimeout);

// @route   GET /api/payments/test
// @desc    Test basic payment route
// @access  Public
router.get('/test', (req, res) => {
    res.json({
        message: 'Payment routes working',
        timestamp: new Date().toISOString(),
        demoMode: process.env.DARAJA_DEMO_MODE === 'true' || process.env.NODE_ENV === 'development'
    });
});

// @route   GET /api/payments/test-auth
// @desc    Test authentication middleware
// @access  Private
router.get('/test-auth', authMiddleware, (req, res) => {
    res.json({
        message: 'Authentication working',
        user: req.user,
        userId: req.user?.id,
        userType: req.user?.user_type
    });
});

module.exports = router;
