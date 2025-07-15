const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

// All admin routes require authentication
router.use(authMiddleware);

// Dashboard routes
router.get('/dashboard/stats', adminController.getDashboardStats);

// User management routes
router.get('/users/stats', adminController.getUserStats);
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id/status', adminController.updateUserStatus);
router.post('/users/:userId/suspend', adminController.suspendUser);
router.post('/users/:userId/unsuspend', adminController.unsuspendUser);
router.get('/users/:userId/suspension-history', adminController.getUserSuspensionHistory);

// User verification routes
router.get('/users/pending', adminController.getPendingUsers);
router.post('/users/:userId/verify', adminController.verifyUser);

// Job management routes
router.get('/jobs', adminController.getAllJobs);
router.put('/jobs/:id/status', adminController.updateJobStatus);

// Payment management routes
router.get('/payments', adminController.getAllPlatformPayments);
router.get('/payments/statistics', adminController.getPaymentStatistics);
router.post('/payments/statistics/refresh', adminController.refreshPaymentStatistics);
router.get('/payments/analytics', adminController.getPaymentAnalytics);
router.get('/payments/disputes', adminController.getPaymentDisputes);
router.post('/payments/disputes/:disputeId/resolve', adminController.resolvePaymentDispute);
router.post('/payments/:paymentId/refund', adminController.processPaymentRefund);
router.post('/payments/:paymentId/reverse', adminController.reversePayment);
router.get('/payments/config', adminController.getPaymentConfig);
router.put('/payments/config', adminController.updatePaymentConfig);
router.get('/payments/users/:userId', adminController.getUserPaymentHistory);
router.post('/payments/reports', adminController.generatePaymentReport);
router.get('/payments/commission-analytics', adminController.getCommissionAnalytics);
router.get('/payments/user-analytics', adminController.getUserPaymentAnalytics);
router.post('/payments/:paymentId/override-status', adminController.overridePaymentStatus);

// Analytics and reporting routes
router.get('/analytics', adminController.getAnalytics);

// System settings routes
router.get('/settings', adminController.getSystemSettings);
router.put('/settings', adminController.updateSystemSettings);

// Admin activity log
router.get('/activity-log', adminController.getAdminActivityLog);

module.exports = router;
