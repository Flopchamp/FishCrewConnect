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

// Analytics and reporting routes
router.get('/analytics', adminController.getAnalytics);

// System settings routes
router.get('/settings', adminController.getSystemSettings);
router.put('/settings', adminController.updateSystemSettings);

// Admin activity log
router.get('/activity-log', adminController.getAdminActivityLog);

module.exports = router;
