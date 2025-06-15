const db = require('../config/db');

// @desc    Get all conversations for the current user
// @route   GET /api/messages/conversations
// @access  Private
exports.getConversations = async (req, res) => {
    const userId = req.user.id;
    
    try {
        // Query to get all conversations (latest message from each user the current user has interacted with)
        const [conversationsRows] = await db.query(`
            SELECT 
                m.sender_id AS other_user_id,
                u.name AS other_user_name,
                u.profile_image AS other_user_profile_image,
                m.message_text AS last_message,
                m.created_at AS timestamp,
                (
                    SELECT COUNT(*) FROM messages 
                    WHERE recipient_id = ? AND sender_id = m.sender_id AND is_read = FALSE
                ) AS unread_count
            FROM messages m
            INNER JOIN users u ON (
                CASE 
                    WHEN m.sender_id = ? THEN m.recipient_id = u.user_id
                    ELSE m.sender_id = u.user_id
                END
            )
            WHERE m.id IN (
                SELECT MAX(id) FROM messages
                WHERE sender_id = ? OR recipient_id = ?
                GROUP BY 
                    CASE 
                        WHEN sender_id = ? THEN recipient_id 
                        ELSE sender_id 
                    END
            )
            ORDER BY m.created_at DESC
        `, [userId, userId, userId, userId, userId]);
        
        // Format the response to match the frontend expectations
        const conversations = conversationsRows.map(row => ({
            recipientId: row.other_user_id,
            recipientName: row.other_user_name,
            recipientProfileImage: row.other_user_profile_image,
            lastMessage: row.last_message,
            timestamp: row.timestamp,
            unreadCount: row.unread_count
        }));
        
        res.status(200).json(conversations);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ message: 'Server error while fetching conversations.' });
    }
};

// @desc    Get messages between current user and another user
// @route   GET /api/messages/:userId
// @access  Private
exports.getMessages = async (req, res) => {
    const currentUserId = req.user.id;
    const otherUserId = parseInt(req.params.userId);
    
    if (isNaN(otherUserId)) {
        return res.status(400).json({ message: 'Invalid user ID.' });
    }
    
    try {
        // Get all messages between these two users
        const [messagesRows] = await db.query(`
            SELECT 
                id,
                sender_id AS senderId,
                recipient_id AS recipientId,
                message_text AS text,
                created_at AS timestamp,
                is_read AS read
            FROM messages
            WHERE 
                (sender_id = ? AND recipient_id = ?) OR
                (sender_id = ? AND recipient_id = ?)
            ORDER BY created_at ASC
        `, [currentUserId, otherUserId, otherUserId, currentUserId]);
        
        // Mark messages as read
        await db.query(`
            UPDATE messages
            SET is_read = TRUE
            WHERE recipient_id = ? AND sender_id = ? AND is_read = FALSE
        `, [currentUserId, otherUserId]);
        
        res.status(200).json(messagesRows);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Server error while fetching messages.' });
    }
};

// @desc    Send a message to another user
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res) => {
    const senderId = req.user.id;
    const { recipientId, text } = req.body;
    
    if (!recipientId || !text) {
        return res.status(400).json({ message: 'Recipient ID and message text are required.' });
    }
    
    try {
        // Check if recipient exists
        const [userRows] = await db.query('SELECT user_id FROM users WHERE user_id = ?', [recipientId]);
        if (userRows.length === 0) {
            return res.status(404).json({ message: 'Recipient not found.' });
        }
        
        // Insert the message
        const [result] = await db.query(`
            INSERT INTO messages (sender_id, recipient_id, message_text)
            VALUES (?, ?, ?)
        `, [senderId, recipientId, text]);
        
        // Get the created message
        const [messageRows] = await db.query(`
            SELECT 
                id,
                sender_id AS senderId,
                recipient_id AS recipientId,
                message_text AS text,
                created_at AS timestamp,
                is_read AS read
            FROM messages
            WHERE id = ?
        `, [result.insertId]);
        
        // Emit a Socket.IO event for real-time delivery
        if (req.io) {
            req.io.to(recipientId.toString()).emit('new_message', messageRows[0]);
        }
        
        res.status(201).json(messageRows[0]);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Server error while sending message.' });
    }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/read
// @access  Private
exports.markMessagesAsRead = async (req, res) => {
    const recipientId = req.user.id;
    const { messageIds } = req.body;
    
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ message: 'Message IDs array is required.' });
    }
    
    try {
        // Update messages to mark as read
        const [result] = await db.query(`
            UPDATE messages
            SET is_read = TRUE
            WHERE id IN (?) AND recipient_id = ?
        `, [messageIds, recipientId]);
        
        res.status(200).json({
            success: true,
            count: result.affectedRows
        });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ message: 'Server error while marking messages as read.' });
    }
};
