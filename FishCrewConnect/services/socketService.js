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

let socket = null;

export const useSocketIO = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);
  // Initialize socket connection
  useEffect(() => {
    // Clean up any existing socket
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }
    
    try {
      console.log('Initializing Socket.IO connection to:', SOCKET_URL);
      socket = io(SOCKET_URL, socketOptions);
      
      // Set up event listeners
      socket.on('connect', () => {
        console.log('Socket.IO connected! Socket ID:', socket.id);
        console.log('Connected using transport:', socket.io.engine.transport.name);
        setIsConnected(true);
        setError(null);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected! Reason:', reason);
        setIsConnected(false);
      });      socket.on('connect_error', (err) => {
        console.error('Socket.IO connection error:', err.message);
        console.error('Socket.IO URL attempted:', SOCKET_URL);
        setError(err.message);
      });
      
      socket.on('error', (err) => {
        console.error('Socket.IO general error:', err);
        setError(err.message || 'Unknown socket error');
      });
      
      // Connect with a small delay to ensure listeners are set up
      setTimeout(() => {
        console.log('Attempting socket connection...');
        socket.connect();
      }, 500);
    } catch (err) {
      console.error('Failed to initialize socket:', err);
      setError(err.message || 'Failed to initialize socket');
    }    // Join user's room when user ID is available
    const joinUserRoom = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData && socket && socket.connected) {
          const user = JSON.parse(userData);
          if (user && user.id) {
            socket.emit('join_room', user.id);
            console.log(`Joined room for user ${user.id}`);
          }
        }
      } catch (error) {
        console.error('Failed to join user room:', error);
      }
    };

    if (isConnected && socket) {
      joinUserRoom();
      
      // Set up new_notification listener
      socket.on('new_notification', (data) => {
        console.log('New notification received:', data);
        setLastMessage(data);
        setNotifications((prevNotifications) => [...prevNotifications, data]);
      });
    }    // Return cleanup function
    return () => {
      console.log('Cleaning up socket event listeners');
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('error');
        socket.off('new_notification');
      }
    };
  }, [isConnected]); // Include isConnected in dependencies
  // Method to manually reconnect with support for changing transport
  const connect = () => {
    if (socket) {
      console.log('Manual reconnection attempt...');
      
      // Try to connect with current settings
      socket.connect();
      
      // If still not connected after a delay, try alternative transport
      setTimeout(() => {
        if (!socket.connected) {
          console.log('Trying alternative connection method');
          // Force reconnection with different transport priority
          socket.io.opts.transports = ['polling', 'websocket'].reverse();
          socket.connect();
        }
      }, 2000);
    }
  };

  // Method to manually disconnect
  const disconnect = () => {
    if (socket) {
      console.log('Manual disconnection');
      socket.disconnect();
    }
  };

  // Method to clear notifications
  const clearNotifications = () => {
    setNotifications([]);
  };
  return {
    socket,
    isConnected,
    lastMessage,
    notifications,
    error,
    connect,
    disconnect,
    clearNotifications,
  };
};

export default useSocketIO;
