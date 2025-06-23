import { createContext, useContext, useState, useEffect } from 'react';
import { notificationsAPI } from '../services/api';
import { useSocketIO } from '../services/socketService';

// Create context
const NotificationContext = createContext();

// Provider component
export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket, isConnected } = useSocketIO();
  // Load notifications
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationsAPI.getNotifications();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setNotifications(data);
        
        // Count unread notifications
        const unread = data.filter(notification => !notification.is_read).length;
        setUnreadCount(unread);
      } else {
        // Handle case where data is not an array
        console.warn('Notifications data is not an array:', data);
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      // Set empty array when backend is not available
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      
      // Update local state
      setNotifications(currentNotifications => 
        currentNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true } 
            : notification
        )
      );
      
      // Decrement unread count
      setUnreadCount(current => Math.max(0, current - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      
      // Update local state
      setNotifications(currentNotifications => 
        currentNotifications.map(notification => ({ ...notification, is_read: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Listen for real-time notifications
  useEffect(() => {
    // Only setup listeners if socket is connected
    if (socket && isConnected) {
      const handleNewNotification = (notification) => {
        console.log('New notification received:', notification);
        
        // Add to notifications list
        setNotifications(current => [notification, ...current]);
        
        // Increment unread count
        setUnreadCount(current => current + 1);
      };
      
      // Listen for new notifications
      socket.on('new_notification', handleNewNotification);
      
      return () => {
        socket.off('new_notification', handleNewNotification);
      };
    }
  }, [socket, isConnected]);

  // Initial load of notifications
  useEffect(() => {
    loadNotifications();
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        loadNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook for using the notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
