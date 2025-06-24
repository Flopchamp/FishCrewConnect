import { io } from 'socket.io-client';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

// Socket.IO server URL (using the same URL as the API)
const SOCKET_URL = API_URL;

// Socket.IO connection options - trying polling first, then websocket
const socketOptions = {
  reconnectionAttempts: 15, // Increased attempts for network changes
  reconnectionDelay: 2000,
  timeout: 20000, // Increased timeout
  transports: ['polling', 'websocket'], // Try polling first, then websocket
  autoConnect: false, // We'll connect manually
  forceNew: true,
  path: '/socket.io/', // Default Socket.IO path
  // Additional options for better network handling
  upgrade: true,
  rememberUpgrade: true,
};

// Socket service for direct socket access
class SocketService {
  constructor() {
    this.socket = null;
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized && this.socket) {
      return this.socket;
    }

    try {
      console.log('Initializing Socket.IO connection to:', SOCKET_URL);
      this.socket = io(SOCKET_URL, socketOptions);
      this.isInitialized = true;

      this.socket.on('connect', () => {
        console.log('Socket.IO connected! Socket ID:', this.socket.id);
        console.log('Connected using transport:', this.socket.io.engine.transport.name);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected! Reason:', reason);
      });

      this.socket.on('connect_error', (err) => {
        console.error('Socket.IO connection error:', err.message);
        console.error('Socket.IO URL attempted:', SOCKET_URL);
      });

      this.socket.on('error', (err) => {
        console.error('Socket.IO general error:', err);
      });

      // Connect with a small delay to ensure listeners are set up
      setTimeout(() => {
        console.log('Attempting socket connection...');
        this.socket.connect();
      }, 500);

      return this.socket;
    } catch (err) {
      console.error('Failed to initialize socket:', err);
      return null;
    }
  }

  getSocket() {
    if (!this.socket) {
      this.initialize();
    }
    return this.socket;
  }

  async joinUserRoom() {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData && this.socket && this.socket.connected) {
        const user = JSON.parse(userData);
        if (user && user.id) {
          this.socket.emit('join_room', user.id);
          console.log(`Joined room for user ${user.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to join user room:', error);
    }
  }

  connect() {
    if (this.socket) {
      console.log('Manual reconnection attempt...');
      this.socket.connect();
      
      setTimeout(() => {
        if (!this.socket.connected) {
          console.log('Trying alternative connection method');
          this.socket.io.opts.transports = ['polling', 'websocket'].reverse();
          this.socket.connect();
        }
      }, 2000);
    }
  }

  disconnect() {
    if (this.socket) {
      console.log('Manual disconnection');
      this.socket.disconnect();
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

// React hook for components that need socket functionality
export const useSocketIO = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    const socket = socketService.getSocket();
    
    if (!socket) {
      setError('Failed to initialize socket');
      return;
    }

    // Set up event listeners
    const handleConnect = () => {
      console.log('Socket.IO connected! Socket ID:', socket.id);
      setIsConnected(true);
      setError(null);
      socketService.joinUserRoom();
    };

    const handleDisconnect = (reason) => {
      console.log('Socket.IO disconnected! Reason:', reason);
      setIsConnected(false);
    };

    const handleConnectError = (err) => {
      console.error('Socket.IO connection error:', err.message);
      setError(err.message);
    };

    const handleError = (err) => {
      console.error('Socket.IO general error:', err);
      setError(err.message || 'Unknown socket error');
    };

    const handleNewNotification = (data) => {
      console.log('New notification received:', data);
      setLastMessage(data);
      setNotifications((prevNotifications) => [...prevNotifications, data]);
    };

    // Attach listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('error', handleError);
    socket.on('new_notification', handleNewNotification);

    // Set initial connection state if already connected
    if (socket.connected) {
      setIsConnected(true);
      socketService.joinUserRoom();
    }

    // Return cleanup function
    return () => {
      console.log('Cleaning up socket event listeners');
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('error', handleError);
      socket.off('new_notification', handleNewNotification);
    };
  }, []);

  // Method to manually reconnect
  const connect = () => {
    socketService.connect();
  };

  // Method to manually disconnect
  const disconnect = () => {
    socketService.disconnect();
  };

  // Method to clear notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  return {
    socket: socketService.getSocket(),
    isConnected,
    lastMessage,
    notifications,
    error,
    connect,
    disconnect,
    clearNotifications,
  };
};

// Export both the service and hook
export { socketService };

// Default export for backward compatibility
export default socketService;
