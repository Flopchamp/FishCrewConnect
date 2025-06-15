import { messagesAPI as apiMessagesService } from './api';
import { useSocketIO } from './socketService';

// Hooks for real-time message functionality
export const useMessaging = (userId) => {
  const { socket, isConnected } = useSocketIO();
  
  // Setup socket listeners for messages if needed
  const setupMessageListeners = (onNewMessage) => {
    if (socket && isConnected) {
      // Join a room for this user to receive messages
      socket.emit('join_room', userId);
      
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
  };
  
  // Send a message through socket
  const sendMessage = (messageData) => {
    if (socket && isConnected) {
      socket.emit('send_message', messageData);
      return true;
    }
    return false;
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
  },
  
  getMessages: async (otherUserId) => {
    try {
      return await apiMessagesService.getMessages(otherUserId);
    } catch (error) {
      console.error('Get messages error:', error);
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
