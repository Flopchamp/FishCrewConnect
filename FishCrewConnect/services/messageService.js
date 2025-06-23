import { messagesAPI as apiMessagesService } from './api';
import { useSocketIO } from './socketService';

// Hooks for real-time message functionality
export const useMessaging = (userId) => {
  const { socket, isConnected } = useSocketIO();
  
  // Setup socket listeners for messages if needed
  const setupMessageListeners = (onNewMessage) => {
    // Check for invalid userId early
    if (!userId) {
      console.warn('setupMessageListeners: No user ID provided, cannot setup listeners');
      // Return empty cleanup function to prevent errors
      return () => {};
    }
    
    // Parse userId to ensure it's a number
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      console.error('setupMessageListeners: Invalid user ID format:', userId);
      return () => {};
    }
    
    // Only join a room and set up listeners if we have everything we need
    if (socket && isConnected) {
      console.log('Setting up message listeners for user:', parsedUserId);
      
      // Join a room for this user to receive messages
      socket.emit('join_room', parsedUserId);
      
      // Listen for new messages
      socket.on('new_message', (data) => {
        if (onNewMessage && typeof onNewMessage === 'function') {
          onNewMessage(data);
        }
      });
      
      return () => {
        socket.off('new_message');
      };
    }
    
    // Return empty cleanup if socket isn't ready
    return () => {};
  };
  // Send a message through socket
  const sendMessage = (messageData) => {
    // Check for invalid userId early
    if (!userId) {
      console.error('Cannot send message - no user ID provided');
      return false;
    }
    
    // Parse userId to ensure it's a number
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      console.error('sendMessage: Invalid user ID format:', userId);
      return false;
    }
    
    // Ensure we have a socket connection before attempting to send
    if (!socket || !isConnected) {
      console.warn('Socket not connected - message will not be sent in real-time');
      return false;
    }
    
    // Verify messageData is valid
    if (!messageData || !messageData.recipientId || !messageData.text) {
      console.error('Invalid message data:', messageData);
      return false;
    }
    
    // All checks passed, send the message
    console.log('Sending message via socket:', messageData);
    socket.emit('send_message', messageData);
    return true;
  };
  
  return { setupMessageListeners, sendMessage };
};

// Re-export API methods
export const messagesAPI = {
  getConversations: async () => {
    try {
      return await apiMessagesService.getConversations();
    } catch (error) {
      console.error('Get conversations error:', error);
      throw error;
    }
  },  getMessages: async (currentUserId, otherUserId) => {
    try {
      console.log('messageService.getMessages called with currentUserId:', currentUserId, 'otherUserId:', otherUserId);
      
      // Check for undefined values before parsing
      if (currentUserId === undefined || currentUserId === null) {
        console.error('Current user ID is undefined or null');
        throw new Error('You must be logged in to view messages. Please sign in again.');
      }
      
      if (otherUserId === undefined || otherUserId === null) {
        console.error('Recipient ID is undefined or null');
        throw new Error('Invalid recipient. Please go back and try again.');
      }
      
      // Convert to string first to handle any non-string inputs safely
      const currentUserIdStr = String(currentUserId);
      const otherUserIdStr = String(otherUserId);
      
      // Now parse to numbers after confirming they exist, with meaningful error messages
      const recipientId = parseInt(otherUserIdStr, 10);
      const userId = parseInt(currentUserIdStr, 10);
      
      if (isNaN(recipientId)) {
        console.error('Invalid recipient ID for getMessages:', otherUserIdStr);
        throw new Error(`Invalid recipient ID: ${otherUserIdStr}. Please select a valid contact.`);
      }
      
      if (isNaN(userId)) {
        console.error('Invalid current user ID for getMessages:', currentUserIdStr);
        // This is likely an auth issue, provide a user-friendly message
        throw new Error(`Authentication required. Please sign in again to continue.`);
      }

      // Check for self-messaging attempt on client side
      if (userId === recipientId) {
        console.error('Attempted to get messages with self:', currentUserId);
        throw {
          message: 'You cannot message yourself',
          isSelfMessagingError: true
        };
      }

      console.log('Fetching messages between', userId, 'and', recipientId);
      const messages = await apiMessagesService.getMessages(recipientId);
      console.log('Message fetch result:', Array.isArray(messages) ? `${messages.length} messages` : 'non-array data');
      return messages;
    } catch (error) {
      console.error('Get messages error:', error);
      
      // Preserve self-messaging error flag for proper handling in UI
      if (
          error.isSelfMessagingError || 
          (error.response?.data?.code === 'SELF_MESSAGING_NOT_ALLOWED') ||
          (typeof error === 'string' && error.includes('self')) ||
          (error.message && typeof error.message === 'string' && error.message.includes('self'))) {
        console.error('Self-messaging error detected in messageService');
        // Make sure we pass along a properly structured error that UI can identify
        throw {
          message: 'You cannot message yourself',
          isSelfMessagingError: true,
          originalError: error
        };
      }
      
      // For other errors, pass them through
      throw error;
    }
  },
  
  sendMessage: async (recipientId, text) => {
    try {
      return await apiMessagesService.sendMessage(recipientId, text);
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  },
  
  markAsRead: async (messageIds) => {
    try {
      return await apiMessagesService.markAsRead(messageIds);
    } catch (error) {
      console.error('Mark messages as read error:', error);
      throw error;
    }
  }
};

export default messagesAPI;
