import React, { useState } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, Text, RefreshControl, TouchableOpacity } from 'react-native';
import NotificationItem from '../../components/NotificationItem';
import { Ionicons } from '@expo/vector-icons';
import SafeScreenWrapper from '../../components/SafeScreenWrapper';
import HeaderBox from '../../components/HeaderBox';
import { useNotifications } from '../../context/NotificationContext';

const NotificationsScreen = () => {
  const { notifications, loading, markAsRead, loadNotifications, markAllAsRead } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  
  const hasUnread = notifications.some(notification => !notification.is_read);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications().finally(() => {
      setRefreshing(false);
    });
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const renderNotificationItem = ({ item }) => (
    <NotificationItem 
      notification={item} 
      onMarkAsRead={handleMarkAsRead} 
    />
  );
  return (
    <SafeScreenWrapper>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <HeaderBox title="Notifications" />
        {hasUnread && (
          <TouchableOpacity 
            style={styles.markAllBtn}
            onPress={markAllAsRead}
          >
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#44DBE9" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              colors={['#44DBE9']} 
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No notifications yet</Text>              <Text style={styles.emptySubtext}>
                You&apos;ll be notified about job applications, messages, and more
              </Text>
            </View>
          }
        />
      )}
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    color: '#333',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(68, 219, 233, 0.15)',
    borderRadius: 16,
    marginRight: 16,
  },
  markAllText: {
    fontSize: 12,
    color: '#44DBE9',
    fontWeight: '600',
  },
});

export default NotificationsScreen;
