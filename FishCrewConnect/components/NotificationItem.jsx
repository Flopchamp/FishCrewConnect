import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

/**
 * NotificationItem Component - Display individual notifications
 * @param {object} notification - The notification data
 * @param {function} onMarkAsRead - Function to mark notification as read
 */
const NotificationItem = ({ notification, onMarkAsRead }) => {
  const router = useRouter();
  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_application':
        return 'document-text-outline';
      case 'application_status':
      case 'application_status_update':
        // Check if we can determine the status from the message
        if (notification.message) {
          if (notification.message.toLowerCase().includes('accepted')) {
            return 'checkmark-circle';
          } else if (notification.message.toLowerCase().includes('rejected')) {
            return 'close-circle-outline';
          } else if (notification.message.toLowerCase().includes('shortlisted')) {
            return 'list-circle-outline';
          } else if (notification.message.toLowerCase().includes('viewed')) {
            return 'eye-outline';
          }
        }
        return 'checkmark-circle-outline';
      case 'new_message':
        return 'chatbubble-outline';
      case 'message':
        return 'chatbubble-outline';
      case 'new_review':
      case 'review':
        return 'star-outline';
      default:
        return 'notifications-outline';
    }
  };

  // Format notification time
  const formatTime = (timestamp) => {
    const now = new Date();
    const notifDate = new Date(timestamp);
    const diffMs = now - notifDate;
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else {
      return notifDate.toLocaleDateString();
    }
  };
  // Handle notification press - navigate to the linked page
  const handlePress = () => {
    console.log('Notification pressed:', notification);
    console.log('Navigation link:', notification.link);
    
    if (!notification.is_read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    
    if (notification.link) {
      try {
        router.push(notification.link);
      } catch (error) {
        console.error('Navigation error:', error);
        console.error('Failed to navigate to:', notification.link);
      }
    } else {
      console.warn('No link provided for notification:', notification);
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        !notification.is_read && styles.unreadContainer
      ]}
      onPress={handlePress}
    >
      <View style={styles.iconContainer}>
        <Ionicons 
          name={getNotificationIcon(notification.type)} 
          size={24} 
          color="#44DBE9"
        />
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.message}>{notification.message}</Text>
        <Text style={styles.time}>{formatTime(notification.created_at)}</Text>
      </View>
      
      {!notification.is_read && (
        <View style={styles.unreadIndicator} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: 'white',
  },
  unreadContainer: {
    backgroundColor: '#F5FCFD',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5F6',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#44DBE9',
    alignSelf: 'center',
  },
});

export default NotificationItem;
