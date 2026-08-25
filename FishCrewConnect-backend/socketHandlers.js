const logger = require('./utils/logger');
const { canUsersMessage } = require('./services/messagingConnections');

/**
 * The `send_message` socket handler, as a plain function so it can be tested
 * without standing up a server. Silence is the failure mode here: a socket has
 * no status codes, so a rejected send simply emits nothing.
 */
const createSendMessageHandler = (io, socket) => async (messageData) => {
    try {
        const { recipientId, text } = messageData;
        if (!recipientId || !text || typeof text !== 'string') return;
        if (text.length > 5000) return;

        const senderId = parseInt(socket.userId, 10);
        const parsedRecipientId = parseInt(recipientId, 10);
        if (isNaN(parsedRecipientId) || senderId === parsedRecipientId) return;

        // Same rule, same function as POST /api/messages.
        if (!(await canUsersMessage(senderId, parsedRecipientId))) {
            logger.warn(`Socket: user ${senderId} attempted to message unconnected user ${parsedRecipientId}`);
            return;
        }

        io.to(parsedRecipientId.toString()).emit('new_message', {
            id: Date.now(),
            senderId: socket.userId,
            recipientId: parsedRecipientId,
            text,
            timestamp: new Date().toISOString(),
            read: false,
        });
    } catch (error) {
        logger.error('Error handling send_message event:', error);
    }
};

module.exports = { createSendMessageHandler };
