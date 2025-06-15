import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import SafeScreenWrapper from '../components/SafeScreenWrapper';
import DefaultProfileImage from '../components/DefaultProfileImage';
import { messagesAPI, useMessaging } from '../services/messageService';

const MessagingScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const flatListRef = useRef(null);
  const params = useLocalSearchParams();
  const { recipientId, recipientName, recipientProfileImage } = params;
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Get messaging functionality
  const { setupMessageListeners, sendMessage } = useMessaging(user?.id);

  // Load message history and setup real-time updates
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true);
        const messageHistory = await messagesAPI.getMessages(recipientId);
        setMessages(messageHistory);
        
        // Scroll to the bottom of the messages
        setTimeout(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: false });
          }
        }, 100);
      } catch (error) {
        console.error("Error loading messages:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadMessages();
    
    // Setup listener for real-time message updates
    const cleanup = setupMessageListeners((newMessage) => {
      // Add new message to the list if it's from the current conversation
      if (newMessage.senderId === parseInt(recipientId, 10) || 
          newMessage.recipientId === parseInt(recipientId, 10)) {
        setMessages(prev => [...prev, newMessage]);
        
        // Mark received message as read
        if (newMessage.senderId === parseInt(recipientId, 10)) {
          messagesAPI.markAsRead([newMessage.id]).catch(console.error);
        }
        
        // Scroll to the new message
        setTimeout(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    });
    
    return cleanup;
  }, [recipientId, user?.id, setupMessageListeners]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      // Send message via API
      const message = await messagesAPI.sendMessage(recipientId, newMessage.trim());
      
      // Add to messages list
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      
      // Also send via socket for real-time delivery
      sendMessage({
        recipientId: parseInt(recipientId, 10),
        text: newMessage.trim()
      });
      
      // Scroll to the new message
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === now.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  // Convert the grouped messages object to an array
  const messageGroups = Object.keys(groupedMessages).map(date => ({
    date,
    messages: groupedMessages[date]
  }));

  const renderMessage = ({ item }) => {
    const isCurrentUser = item.senderId === user.id;
    
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.sentMessage : styles.receivedMessage
      ]}>
        <Text style={isCurrentUser ? styles.messageTextSent : styles.messageText}>{item.text}</Text>
        <Text style={styles.messageTime}>{formatTime(item.timestamp)}</Text>
      </View>
    );
  };

  const renderDateHeader = ({ date }) => (
    <View style={styles.dateHeaderContainer}>
      <Text style={styles.dateHeaderText}>{date}</Text>
    </View>
  );

  return (
    <SafeScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.profileContainer}>
          {recipientProfileImage ? (
            <Image source={{ uri: recipientProfileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImageContainer}>
              <DefaultProfileImage size={36} />
            </View>
          )}
          <Text style={styles.recipientName}>{recipientName || 'Chat'}</Text>
        </View>
        
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0077B6" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messageGroups}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => (
            <>
              {renderDateHeader(item)}
              {item.messages.map(message => renderMessage({ item: message }))}
            </>
          )}
          contentContainerStyle={styles.messagesContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
            </View>
          }
        />
      )}
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          multiline
          maxHeight={100}
        />
        <TouchableOpacity
          style={[styles.sendButton, !newMessage.trim() && styles.disabledButton]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim()}
        >
          <Ionicons name="send" size={24} color={newMessage.trim() ? "#0077B6" : "#bbb"} />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white'
  },
  backButton: {
    padding: 4
  },
  profileContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12
  },
  profileImageContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 12
  },
  recipientName: {
    fontSize: 18,
    fontWeight: '600'
  },
  moreButton: {
    padding: 4
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 16
  },
  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 16
  },
  dateHeaderText: {
    backgroundColor: '#eee',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    color: '#666'
  },
  messageContainer: {
    maxWidth: '80%',
    maxHeight: 100,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#0077B6',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#eee'
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  messageTextSent: {
    fontSize: 16,
    color: 'white',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    alignSelf: 'flex-end',
    marginTop: 4
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: 'white'
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    paddingBottom: 8,
    width: 40
  },
  disabledButton: {
    opacity: 0.5
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center'
  }
});

export default MessagingScreen;
