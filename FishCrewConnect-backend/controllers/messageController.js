const db = require('../config/db');

// @desc    Get all conversations for the current user
// @route   GET /api/messages/conversations
// @access  Private
exports.getConversations = async (req, res) => {
    const userId = req.user.id;      try {        // Query to get all conversations (latest message from each user the current user has interacted with)
        const conversationsQuery = "SELECT " +
            "IF(m.sender_id = ?, m.recipient_id, m.sender_id) AS other_user_id, " +
            "u.name AS other_user_name, " +
            "NULL AS other_user_profile_image, " +
            "m.message_text AS last_message, " +
            "m.created_at AS timestamp, " +
            "(SELECT COUNT(*) FROM messages WHERE recipient_id = ? AND sender_id = IF(m.sender_id = ?, m.recipient_id, m.sender_id) AND is_read = FALSE) AS unread_count " +
            "FROM messages m " +
            "INNER JOIN users u ON (u.user_id = IF(m.sender_id = ?, m.recipient_id, m.sender_id)) " +
            "WHERE m.id IN (" +
            "  SELECT MAX(id) FROM messages " +
            "  WHERE sender_id = ? OR recipient_id = ? " +
            "  GROUP BY IF(sender_id = ?, recipient_id, sender_id) " +
            ") " +
            "ORDER BY m.created_at DESC";
              const [conversationsRows] = await db.query(conversationsQuery, [
            userId, userId, userId, userId, userId, userId, userId
        ]);
        
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
    
    // Check if user is trying to message themselves
    if (currentUserId === otherUserId) {
        console.error(`User ${currentUserId} attempted to get messages with themselves`);
        return res.status(400).json({ 
            message: 'Cannot retrieve messages with yourself.',
            error: 'SELF_MESSAGING_NOT_ALLOWED'
        });
    }
    
    // Log the request details for debugging
    console.log(`Getting messages between users ${currentUserId} and ${otherUserId}`);
      
    try {        // Get all messages between these two users
        const messagesQuery = "SELECT id, sender_id AS senderId, recipient_id AS recipientId, " +
            "message_text AS text, created_at AS timestamp, is_read AS `read` " +
            "FROM messages " +
            "WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?) " +
            "ORDER BY created_at ASC";
        const [messagesRows] = await db.query(messagesQuery, [
            currentUserId, otherUserId, otherUserId, currentUserId
        ]);
        
        // Log the result for debugging
        console.log(`Found ${messagesRows.length} messages between users ${currentUserId} and ${otherUserId}`);
          // Mark messages as read
        const updateQuery = "UPDATE messages SET is_read = TRUE " +
            "WHERE recipient_id = ? AND sender_id = ? AND is_read = FALSE";
        await db.query(updateQuery, [currentUserId, otherUserId]);
        
        // Always return an array, even if empty
        res.status(200).json(messagesRows || []);
    } catch (error) {
        console.error('Error fetching messages:', error);
        // Return empty array on error to prevent UI crashes
        res.status(200).json([]);
    }
};

// @desc    Send a message to another user
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res) => {
    const senderId = req.user.id;
    const { recipientId, text } = req.body;
    
    // Improved validation
    if (!recipientId) {
        return res.status(400).json({ message: 'Recipient ID is required.' });
    }
    
    if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: 'Message text is required and must be a string.' });
    }
    
    // Parse recipientId as an integer if it's a string
    const parsedRecipientId = parseInt(recipientId, 10);
    
    if (isNaN(parsedRecipientId)) {
        return res.status(400).json({ message: 'Recipient ID must be a valid number.' });
    }
    
    // Prevent sending message to yourself
    if (parsedRecipientId === senderId) {
        return res.status(400).json({ message: 'Cannot send a message to yourself.' });
    }
    
    try {
        // Check if recipient exists
        const [userRows] = await db.query('SELECT user_id FROM users WHERE user_id = ?', [parsedRecipientId]);
        if (userRows.length === 0) {
            return res.status(404).json({ message: 'Recipient not found.' });
        }
        
        // Trim message text and check it's not empty after trimming
        const trimmedText = text.trim();
        if (!trimmedText) {
            return res.status(400).json({ message: 'Message text cannot be empty.' });
        }
          // Insert the message with explicit column names and values
        const query = "INSERT INTO messages (sender_id, recipient_id, message_text, is_read) VALUES (?, ?, ?, FALSE)";
        const [result] = await db.query(query, [senderId, parsedRecipientId, trimmedText]);
        
        if (!result || !result.insertId) {
            throw new Error('Failed to insert message into database');
        }        // Get the created message
        const selectQuery = "SELECT id, sender_id AS senderId, recipient_id AS recipientId, " +
            "message_text AS text, created_at AS timestamp, is_read AS `read` " +
            "FROM messages WHERE id = ?";
        const [messageRows] = await db.query(selectQuery, [result.insertId]);
        
        if (!messageRows || messageRows.length === 0) {
            throw new Error('Failed to retrieve created message');
        }

        // Get sender's name for notification
        const [senderRows] = await db.query('SELECT name FROM users WHERE user_id = ?', [senderId]);
        const senderName = senderRows.length > 0 ? senderRows[0].name : 'Someone';

        // Create a notification for the recipient
        const notificationMessage = `New message from ${senderName}`;
        const notificationLink = `/messaging?recipientId=${senderId}&recipientName=${encodeURIComponent(senderName)}`;
        
        await db.query(
            'INSERT INTO notifications (user_id, type, message, link, is_read) VALUES (?, ?, ?, ?, FALSE)',
            [parsedRecipientId, 'new_message', notificationMessage, notificationLink]
        );

        // Get the notification we just created
        const [notificationRows] = await db.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
            [parsedRecipientId]
        );
        
        // Emit Socket.IO events for real-time delivery
        if (req.io) {
            // Send the message to the recipient
            req.io.to(parsedRecipientId.toString()).emit('new_message', messageRows[0]);
            
            // Send notification to the recipient
            if (notificationRows.length > 0) {
                req.io.to(parsedRecipientId.toString()).emit('new_notification', notificationRows[0]);
            }
        }
        
        res.status(201).json(messageRows[0]);
    } catch (error) {
        console.error('Error sending message:', error);
        
        // Provide more specific error messages based on the error type
        if (error.code === 'ER_NO_REFERENCED_ROW') {
            return res.status(400).json({ 
                message: 'Failed to send message. Either the sender or recipient does not exist.' 
            });
        } else if (error.code === 'ER_DATA_TOO_LONG') {
            return res.status(400).json({ 
                message: 'Message text is too long. Please send a shorter message.' 
            });
        }
        
        res.status(500).json({ 
            message: 'Server error while sending message.', 
            details: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
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
    
    try {        // Update messages to mark as read
        const updateQuery = "UPDATE messages SET is_read = TRUE WHERE id IN (?) AND recipient_id = ?";
        const [result] = await db.query(updateQuery, [messageIds, recipientId]);
        
        res.status(200).json({
            success: true,
            count: result.affectedRows
        });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ message: 'Server error while marking messages as read.' });
    }
};
