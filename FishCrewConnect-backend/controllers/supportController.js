const db = require('../config/db');
const emailService = require('../services/emailService');

// @desc    Submit support ticket
// @route   POST /api/support/ticket
// @access  Private
exports.submitSupportTicket = async (req, res) => {
    const { category, subject, description, priority } = req.body;
    const userId = req.user.id;

    try {
        // Validate input
        if (!category || !subject || !description) {
            return res.status(400).json({ 
                message: 'Category, subject, and description are required' 
            });
        }

        // Get user information
        const [users] = await db.query(
            'SELECT name, email, user_type FROM users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = users[0];

        // Create support ticket
        const [result] = await db.query(
            `INSERT INTO support_tickets (
                user_id, category, subject, description, priority, 
                status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, 'open', NOW(), NOW())`,
            [userId, category, subject, description, priority || 'normal']
        );

        const ticketId = result.insertId;

        // Send email notification to support team
        try {
            await emailService.sendSupportTicketNotification({
                ticketId,
                userName: user.name,
                userEmail: user.email,
                userType: user.user_type,
                category,
                subject,
                description,
                priority: priority || 'normal'
            });
        } catch (emailError) {
            console.error('Failed to send support email notification:', emailError);
            // Continue execution even if email fails
        }

        // Send confirmation email to user
        try {
            await emailService.sendSupportTicketConfirmation({
                userEmail: user.email,
                userName: user.name,
                ticketId,
                subject
            });
        } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
            // Continue execution even if email fails
        }

        res.status(201).json({
            message: 'Support ticket submitted successfully',
            ticketId,
            status: 'open'
        });

    } catch (error) {
        console.error('Error submitting support ticket:', error);
        res.status(500).json({ 
            message: 'Failed to submit support ticket',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// @desc    Get user's support tickets
// @route   GET /api/support/tickets
// @access  Private
exports.getUserSupportTickets = async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    try {
        let query = `
            SELECT id, category, subject, description, priority, status, 
                   created_at, updated_at, admin_response, admin_response_at
            FROM support_tickets 
            WHERE user_id = ?
        `;
        let queryParams = [userId];

        if (status) {
            query += ' AND status = ?';
            queryParams.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        queryParams.push(parseInt(limit), parseInt(offset));

        const [tickets] = await db.query(query, queryParams);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM support_tickets WHERE user_id = ?';
        let countParams = [userId];

        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }

        const [totalCount] = await db.query(countQuery, countParams);

        res.json({
            tickets,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount[0].total / limit),
                totalTickets: totalCount[0].total,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error getting support tickets:', error);
        res.status(500).json({ 
            message: 'Failed to get support tickets',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// @desc    Get support ticket details
// @route   GET /api/support/tickets/:ticketId
// @access  Private
exports.getSupportTicketDetails = async (req, res) => {
    const { ticketId } = req.params;
    const userId = req.user.id;

    try {
        const [tickets] = await db.query(
            `SELECT id, category, subject, description, priority, status, 
                    created_at, updated_at, admin_response, admin_response_at
             FROM support_tickets 
             WHERE id = ? AND user_id = ?`,
            [ticketId, userId]
        );

        if (tickets.length === 0) {
            return res.status(404).json({ message: 'Support ticket not found' });
        }

        res.json(tickets[0]);

    } catch (error) {
        console.error('Error getting support ticket details:', error);
        res.status(500).json({ 
            message: 'Failed to get support ticket details',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// @desc    Update support ticket (user can add comments)
// @route   PUT /api/support/tickets/:ticketId
// @access  Private
exports.updateSupportTicket = async (req, res) => {
    const { ticketId } = req.params;
    const { userComment } = req.body;
    const userId = req.user.id;

    try {
        // Verify ticket ownership
        const [tickets] = await db.query(
            'SELECT id, status FROM support_tickets WHERE id = ? AND user_id = ?',
            [ticketId, userId]
        );

        if (tickets.length === 0) {
            return res.status(404).json({ message: 'Support ticket not found' });
        }

        if (tickets[0].status === 'closed') {
            return res.status(400).json({ message: 'Cannot update closed ticket' });
        }

        // Add user comment
        if (userComment) {
            await db.query(
                'UPDATE support_tickets SET user_comment = ?, updated_at = NOW() WHERE id = ?',
                [userComment, ticketId]
            );
        }

        res.json({ message: 'Support ticket updated successfully' });

    } catch (error) {
        console.error('Error updating support ticket:', error);
        res.status(500).json({ 
            message: 'Failed to update support ticket',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Admin functions for managing support tickets

// @desc    Get all support tickets (Admin only)
// @route   GET /api/support/admin/tickets
// @access  Private (Admin only)
exports.getAllSupportTickets = async (req, res) => {
    const { page = 1, limit = 20, status, category, priority } = req.query;
    const offset = (page - 1) * limit;

    try {
        let query = `
            SELECT st.id, st.category, st.subject, st.description, st.priority, 
                   st.status, st.created_at, st.updated_at,
                   u.name as user_name, u.email as user_email, u.user_type
            FROM support_tickets st
            JOIN users u ON st.user_id = u.user_id
            WHERE 1=1
        `;
        let queryParams = [];

        if (status) {
            query += ' AND st.status = ?';
            queryParams.push(status);
        }

        if (category) {
            query += ' AND st.category = ?';
            queryParams.push(category);
        }

        if (priority) {
            query += ' AND st.priority = ?';
            queryParams.push(priority);
        }

        query += ' ORDER BY st.created_at DESC LIMIT ? OFFSET ?';
        queryParams.push(parseInt(limit), parseInt(offset));

        const [tickets] = await db.query(query, queryParams);

        // Get total count
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM support_tickets st
            JOIN users u ON st.user_id = u.user_id
            WHERE 1=1
        `;
        let countParams = [];

        if (status) {
            countQuery += ' AND st.status = ?';
            countParams.push(status);
        }

        if (category) {
            countQuery += ' AND st.category = ?';
            countParams.push(category);
        }

        if (priority) {
            countQuery += ' AND st.priority = ?';
            countParams.push(priority);
        }

        const [totalCount] = await db.query(countQuery, countParams);

        res.json({
            tickets,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount[0].total / limit),
                totalTickets: totalCount[0].total,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error getting all support tickets:', error);
        res.status(500).json({ 
            message: 'Failed to get support tickets',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// @desc    Respond to support ticket (Admin only)
// @route   PUT /api/support/admin/tickets/:ticketId/respond
// @access  Private (Admin only)
exports.respondToSupportTicket = async (req, res) => {
    const { ticketId } = req.params;
    const { response, status } = req.body;
    const adminId = req.user.id;

    try {
        // Get ticket details
        const [tickets] = await db.query(
            `SELECT st.*, u.name as user_name, u.email as user_email
             FROM support_tickets st
             JOIN users u ON st.user_id = u.user_id
             WHERE st.id = ?`,
            [ticketId]
        );

        if (tickets.length === 0) {
            return res.status(404).json({ message: 'Support ticket not found' });
        }

        const ticket = tickets[0];

        // Update ticket with admin response
        await db.query(
            `UPDATE support_tickets 
             SET admin_response = ?, admin_id = ?, admin_response_at = NOW(), 
                 status = ?, updated_at = NOW()
             WHERE id = ?`,
            [response, adminId, status || 'responded', ticketId]
        );

        // Send email notification to user
        try {
            await emailService.sendSupportTicketResponse({
                userEmail: ticket.user_email,
                userName: ticket.user_name,
                ticketId,
                subject: ticket.subject,
                response
            });
        } catch (emailError) {
            console.error('Failed to send response email:', emailError);
            // Continue execution even if email fails
        }

        res.json({ message: 'Response sent successfully' });

    } catch (error) {
        console.error('Error responding to support ticket:', error);
        res.status(500).json({ 
            message: 'Failed to respond to support ticket',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};
