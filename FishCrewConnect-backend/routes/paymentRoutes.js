const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');
const verifyMpesaCallback = require('../middleware/mpesaCallbackAuth');

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

// M-Pesa callback routes. Not authenticated by a token — Safaricom has none —
// but gated on a secret path segment, since these endpoints move money.
// The URL is built by buildCallbackUrl() in paymentController.

// @route   POST /api/payments/daraja/callback/:secret
// @desc    Handle M-Pesa STK Push callback
// @access  Safaricom only (secret path segment)
router.post('/daraja/callback/:secret', verifyMpesaCallback, paymentController.handleMpesaCallback);

// @route   POST /api/payments/daraja/result/:secret
// @desc    Handle M-Pesa B2C result callback
// @access  Safaricom only (secret path segment)
router.post('/daraja/result/:secret', verifyMpesaCallback, paymentController.handleB2CResult);

// @route   POST /api/payments/daraja/timeout/:secret
// @desc    Handle M-Pesa timeout callback
// @access  Safaricom only (secret path segment)
router.post('/daraja/timeout/:secret', verifyMpesaCallback, paymentController.handleTimeout);

if (process.env.NODE_ENV !== 'production') {
    router.get('/test', (req, res) => {
        res.json({
            message: 'Payment routes working',
            timestamp: new Date().toISOString(),
            demoMode: process.env.DARAJA_DEMO_MODE === 'true',
        });
    });

    router.get('/test-auth', authMiddleware, (req, res) => {
        res.json({
            message: 'Authentication working',
            user: req.user,
            userId: req.user?.id,
            userType: req.user?.user_type,
        });
    });
}

module.exports = router;
