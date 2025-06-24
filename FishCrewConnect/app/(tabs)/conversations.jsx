import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import SafeScreenWrapper from '../../components/SafeScreenWrapper';
import HeaderBox from '../../components/HeaderBox';
import DefaultProfileImage from '../../components/DefaultProfileImage';
import { messagesAPI } from '../../services/messageService';

const ConversationsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
    // Debug auth state
  useEffect(() => {
    console.log('Conversations tab - auth state check:', 
      user ? `User ID: ${user.id}, Name: ${user.name}` : 'No user data available');
  }, [user]);
  
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoading(true);
        
        // Check for auth before loading
        if (!user || !user.id) {
          
          setConversations([]);
          setLoading(false);
          return;
        }
        
        console.log('Loading conversations for user ID:', user.id);
        const data = await messagesAPI.getConversations();
        
        // Filter out any conversations with yourself (if they exist)
        const filteredConversations = user?.id 
          ? data.filter(conversation => conversation.recipientId !== user.id)
          : data;
          
        console.log(`Loaded ${data.length} conversations, showing ${filteredConversations.length} after filtering`);
        setConversations(filteredConversations);
      } catch (error) {
        console.error('Error loading conversations:', error);
        // Handle specific auth errors
        if (error.message?.includes('sign in') || error.response?.status === 401) {
          Alert.alert(
            "Authentication Required", 
            "Please sign in to view your messages",
            [{ text: "OK" }]
          );
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadConversations();
  }, [user]);
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };
  const navigateToChat = (conversation) => {
    // Ensure recipientId is a number before navigation
    const recipientId = parseInt(conversation.recipientId, 10);
    
    // Log the navigation parameters
    console.log('Navigating to chat with parameters:', {
      recipientId,
      recipientName: conversation.recipientName,
      recipientProfileImage: conversation.recipientProfileImage
    });
    
    if (isNaN(recipientId)) {
      console.error('Invalid recipientId:', conversation.recipientId);
      Alert.alert('Error', 'Invalid conversation data. Please try again.');
      return;
    }
    
    // Prevent navigating to chat with yourself
    if (user && user.id === recipientId) {
      console.error('Cannot message yourself');
      Alert.alert('Invalid Action', 'You cannot send messages to yourself.');
      return;
    }
    
    router.push({
      pathname: '/messaging',
      params: {
        recipientId: recipientId, // Send as number
        recipientName: conversation.recipientName || 'Unknown',
        recipientProfileImage: conversation.recipientProfileImage || null
      }
    });
  };
  
  const renderConversationItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.conversationItem} 
      onPress={() => navigateToChat(item)}
    >
      <View style={styles.avatarContainer}>
        {item.recipientProfileImage ? (
          <Image 
            source={{ uri: item.recipientProfileImage }} 
            style={styles.avatar} 
          />
        ) : (
          <DefaultProfileImage size={50} />
        )}
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>{item.unreadCount}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.recipientName}>{item.recipientName}</Text>
          <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
        </View>
        
        <Text 
          style={[styles.lastMessage, item.unreadCount > 0 && styles.unreadMessage]}
          numberOfLines={1} 
          ellipsizeMode="tail"
        >
          {item.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );
  
  return (
    <SafeScreenWrapper>
      <HeaderBox title="Messages" />
      
      <FlatList
        data={conversations}        renderItem={renderConversationItem}
        keyExtractor={(item) => `conv-${item.recipientId}-${new Date(item.timestamp).getTime()}`}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>
              {loading ? 'Loading conversations...' : 'No conversations yet'}
            </Text>
            {!loading && (
              <Text style={styles.emptySubtext}>
                Your messages with boat owners and crew will appear here
              </Text>
            )}
          </View>
        }
      />
      
      {/* New message button */}
      <TouchableOpacity 
        style={styles.newMessageButton}
        onPress={() => router.push('/contacts')}
      >
        <Ionicons name="create-outline" size={24} color="white" />
      </TouchableOpacity>
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ff4c4c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  newMessageButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0077B6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default ConversationsScreen;
