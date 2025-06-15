const db = require('../config/db');

// @desc    Get all notifications for the current user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
    const userId = req.user.id;
    try {
        const [notifications] = await db.query(
            "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
            [userId]
        );
        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Server error while fetching notifications.' });
    }
};

// @desc    Mark a specific notification as read
// @route   PUT /api/notifications/:notificationId/read
// @access  Private
exports.markNotificationAsRead = async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user.id; // To ensure user can only mark their own notifications

    try {
        const [notification] = await db.query(
            "SELECT * FROM notifications WHERE id = ? AND user_id = ?",
            [notificationId, userId]
        );

        if (notification.length === 0) {
            return res.status(404).json({ message: 'Notification not found or user not authorized.' });
        }

        await db.query("UPDATE notifications SET is_read = TRUE WHERE id = ?", [notificationId]);
        res.status(200).json({ message: 'Notification marked as read.' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// @desc    Mark all notifications for the current user as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllNotificationsAsRead = async (req, res) => {
    const userId = req.user.id;
    try {
        await db.query("UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE", [userId]);
        res.status(200).json({ message: 'All unread notifications marked as read.' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};
