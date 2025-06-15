const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// @route   GET /api/messages/conversations
// @desc    Get all conversations for the current user
router.get('/conversations', messageController.getConversations);

// @route   GET /api/messages/:userId
// @desc    Get messages between current user and another user
router.get('/:userId', messageController.getMessages);

// @route   POST /api/messages
// @desc    Send a message to another user
router.post('/', messageController.sendMessage);

// @route   PUT /api/messages/read
// @desc    Mark messages as read
router.put('/read', messageController.markMessagesAsRead);

module.exports = router;
