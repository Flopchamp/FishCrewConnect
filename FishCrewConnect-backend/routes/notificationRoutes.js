const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/notifications
// @desc    Get all notifications for the current user
// @access  Private
router.get('/', authMiddleware, notificationController.getNotifications);

// @route   PUT /api/notifications/:notificationId/read
// @desc    Mark a specific notification as read
// @access  Private
router.put('/:notificationId/read', authMiddleware, notificationController.markNotificationAsRead);

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications for the current user as read
// @access  Private
router.put('/read-all', authMiddleware, notificationController.markAllNotificationsAsRead);

module.exports = router;
