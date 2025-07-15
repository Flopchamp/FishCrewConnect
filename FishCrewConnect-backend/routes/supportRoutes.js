const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const authMiddleware = require('../middleware/authMiddleware');

// User support ticket routes
// @route   POST /api/support/ticket
// @desc    Submit support ticket
// @access  Private
router.post('/ticket', authMiddleware, supportController.submitSupportTicket);

// @route   GET /api/support/tickets
// @desc    Get user's support tickets
// @access  Private
router.get('/tickets', authMiddleware, supportController.getUserSupportTickets);

// @route   GET /api/support/tickets/:ticketId
// @desc    Get support ticket details
// @access  Private
router.get('/tickets/:ticketId', authMiddleware, supportController.getSupportTicketDetails);

// @route   PUT /api/support/tickets/:ticketId
// @desc    Update support ticket (add user comment)
// @access  Private
router.put('/tickets/:ticketId', authMiddleware, supportController.updateSupportTicket);

// Admin support ticket routes
// @route   GET /api/support/admin/tickets
// @desc    Get all support tickets (Admin only)
// @access  Private (Admin only)
router.get('/admin/tickets', authMiddleware, supportController.getAllSupportTickets);

// @route   PUT /api/support/admin/tickets/:ticketId/respond
// @desc    Respond to support ticket (Admin only)
// @access  Private (Admin only)
router.put('/admin/tickets/:ticketId/respond', authMiddleware, supportController.respondToSupportTicket);

module.exports = router;
