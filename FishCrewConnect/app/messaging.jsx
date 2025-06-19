import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Alert } from 'react-native';
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
  const params = useLocalSearchParams();// Parse recipientId as a number immediately to avoid string comparison issues
  const { recipientId: rawRecipientId, recipientName, recipientProfileImage } = params;
  const recipientId = parseInt(rawRecipientId, 10);
  
  // Debug params to understand what's happening
  console.log('Messaging screen params:', params);
    const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  
  // Early verification of auth state to handle fast render before auth is fully loaded
  const hasValidAuth = user && user.id && !isNaN(parseInt(user.id, 10));
  
  console.log('Messaging screen auth check:', hasValidAuth ? 'Valid auth' : 'Missing or invalid auth');
    // Get messaging functionality with proper safety checks for user ID
  const { setupMessageListeners, sendMessage } = useMessaging(
    hasValidAuth && user?.id ? user.id : undefined
  );// Debug auth state
  useEffect(() => {
    console.log('Auth state check in messaging screen:', 
      user ? `User ID: ${user.id}, Name: ${user.name}` : 'No user data available');
  }, [user]);
  // Load message history and setup real-time updates
  useEffect(() => {
    let isMounted = true;
    let hasNavigatedAway = false; // Flag to prevent multiple navigation attempts

    const loadMessages = async () => {
      // Only proceed if we have valid auth and recipient
      if (!user?.id || !recipientId) {
        setLoading(false);
        return;
      }

      // If already tried loading before, don't show loading indicator again
      if (!loading) {
        setLoading(true);
      }
      
      // Debug auth state at load time
      console.log('Load messages function - auth state:',
        user ? `User ID: ${user.id}, authenticated: true` : 'Not authenticated');
      
      try {
        // Ensure recipientId is valid before making API call
        if (!recipientId || isNaN(recipientId)) {
          console.error("Missing or invalid recipientId, cannot load messages", rawRecipientId);
          Alert.alert(
            "Error Loading Messages", 
            "Invalid recipient information. Please go back and try again."
          );
          setMessages([]);
          setLoading(false);
          return;
        }
        
        // Check if user is trying to message themselves - perform early validation
        if (user && user.id === recipientId) {
          console.error("Cannot message yourself - prevented at client side");
          if (isMounted && !hasNavigatedAway) {
            hasNavigatedAway = true; // Prevent multiple alerts/navigations
            Alert.alert(
              "Invalid Action", 
              "You cannot send messages to yourself.",
              [{ 
                text: "OK", 
                onPress: () => router.back() // Navigate back only after alert is acknowledged
              }]
            );
            setMessages([]);
            setLoading(false);
          }
          return; // Exit early
        }        console.log(`Loading messages for recipient ID: ${recipientId} (${typeof recipientId})`);
          // Ensure user is authenticated before attempting to load messages
        if (!hasValidAuth) {
          console.error("No authenticated user found or invalid user ID");
          setAuthError(true);
          Alert.alert(
            "Authentication Error", 
            "You must be logged in to send messages. Please sign in and try again.",
            [{ 
              text: "OK", 
              onPress: () => {
                router.replace('/(auth)/auth-options');
                setLoading(false);
              }
            }]
          );
          setMessages([]);
          setLoading(false);
          return;
        }
        
        // Double check the user ID is valid
        const currentUserId = parseInt(user.id, 10);
        if (isNaN(currentUserId)) {
          console.error("User ID is not a valid number:", user.id);
          Alert.alert(
            "Authentication Error", 
            "Your user account has invalid data. Please sign out and sign in again.",
            [{ text: "OK", onPress: () => router.replace('/(auth)/auth-options') }]
          );
          setMessages([]);
          setLoading(false);
          return;
        }
          console.log(`Current user ID: ${currentUserId}, Recipient ID: ${recipientId}`);
        
        // Extra validation before API call
        if (currentUserId === undefined || recipientId === undefined) {
          throw new Error('Missing required user IDs for message loading');
        }
        
        const messageHistory = await messagesAPI.getMessages(currentUserId, recipientId);
        console.log(`Received ${messageHistory ? (Array.isArray(messageHistory) ? messageHistory.length : 'non-array') : 'no'} messages`);
        
        // Check if component is still mounted before updating state
        if (isMounted) {
          // Ensure we're dealing with an array and log more details for debugging
          if (Array.isArray(messageHistory)) {
            setMessages(messageHistory);
            console.log("Message history loaded successfully:", messageHistory.length, "messages");
            
            // Only scroll if there are messages
            if (messageHistory.length > 0) {
              // Scroll to the bottom of the messages - increased timeout for reliability
              setTimeout(() => {
                if (flatListRef.current) {
                  flatListRef.current.scrollToEnd({ animated: false });
                }
              }, 300);
            }
          } else {
            console.error("Invalid message history format:", messageHistory);
            setMessages([]);
            Alert.alert(
              "Data Error", 
              "There was a problem loading your messages. Please try again.",
              [
                { 
                  text: "Retry", 
                  onPress: () => loadMessages() 
                },
                { 
                  text: "Cancel",
                  style: "cancel"
                }
              ]
            );
          }
        }
      } catch (error) {
        console.error("Error loading messages:", error);
        
        // Check if this is a self-messaging error from the backend
        const isSelfMessagingError = 
          error.response?.data?.code === 'SELF_MESSAGING_NOT_ALLOWED' || 
          error.message?.includes('cannot message yourself') ||
          (typeof error === 'object' && error.message?.includes('self'));
        
        // Handle self-messaging error specially
        if (isSelfMessagingError) {
          console.log("Detected self-messaging error from backend:", error);
          if (isMounted && !hasNavigatedAway) {
            hasNavigatedAway = true;
            Alert.alert(
              "Invalid Action", 
              "You cannot send messages to yourself.",
              [{ 
                text: "OK", 
                onPress: () => router.back() // Go back only after user acknowledges
              }]
            );
          }
          return; // Exit without retries - it will always fail
        }
        
        // Standard error handling for other errors
        if (isMounted) {
          setMessages([]);
          Alert.alert(
            "Connection Error", 
            "Failed to load messages. Please check your connection and try again.",
            [
              { 
                text: "Retry", 
                onPress: () => loadMessages() 
              },
              { 
                text: "Cancel",
                style: "cancel"
              }
            ]
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadMessages();
      // Setup listener for real-time message updates
    const messageCleanup = setupMessageListeners((newMessage) => {
      // Add new message to the list if it's from the current conversation
      if (newMessage && (
          newMessage.senderId === recipientId || 
          newMessage.recipientId === recipientId)
      ) {
        setMessages(prev => {
          // Make sure we have a valid array of previous messages
          const validPrev = Array.isArray(prev) ? prev : [];
          return [...validPrev, newMessage];
        });
          // Mark received message as read
        if (newMessage.id && newMessage.senderId === recipientId) {
          messagesAPI.markAsRead([newMessage.id]).catch(error => 
            console.error("Error marking message as read:", error)
          );
        }
        
        // Scroll to the new message
        setTimeout(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    });    // Return cleanup function
    return () => {
      isMounted = false;
      if (messageCleanup) messageCleanup();
    };
  }, [recipientId, user?.id]); // Only depend on essential values that should trigger reload
    const handleSendMessage = async () => {
    if (!newMessage.trim() || !recipientId || isNaN(recipientId)) return;
    
    const messageToSend = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX
    
    try {
      // Double-check that we're not trying to message ourselves
      if (user && recipientId === user.id) {
        console.error("Cannot send a message to yourself - handled in UI");
        Alert.alert(
          "Invalid Action", 
          "You cannot send messages to yourself.",
          [{ text: "OK", onPress: () => router.back() }]
        );
        return;
      }
      
      // Send message via API
      const message = await messagesAPI.sendMessage(recipientId, messageToSend);
      
      // Add to messages list with error handling
      setMessages(prev => {
        const validPrev = Array.isArray(prev) ? prev : [];
        return [...validPrev, message];
      });
        // Also send via socket for real-time delivery
      sendMessage({
        recipientId, // Already parsed as integer
        text: messageToSend
      });
      
      // Scroll to the new message
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Check for self-messaging error
      if (error.isSelfMessagingError || 
          error.message?.includes('self') ||
          error.response?.data?.code === 'SELF_MESSAGING_NOT_ALLOWED') {
        Alert.alert(
          "Invalid Action", 
          "You cannot send messages to yourself.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        // Generic error handling for other error types
        Alert.alert(
          'Message Error',
          'Failed to send message. Please check your connection and try again.'
        );
        // Restore the message that failed to send so the user can try again
        setNewMessage(messageToSend);
      }
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
  };  // Debug message data
  console.log(`Processing ${messages ? (Array.isArray(messages) ? messages.length : 'non-array') : 'no'} messages for grouping`);
  
  // Group messages by date with proper error handling and more validation
  const groupedMessages = Array.isArray(messages) && messages.length > 0
    ? messages.reduce((groups, message) => {
        // Skip invalid messages
        if (!message || !message.timestamp) {
          console.log("Skipping message without timestamp:", message);
          return groups;
        }
        
        try {
          const date = formatDate(message.timestamp);
          if (!groups[date]) {
            groups[date] = [];
          }
          groups[date].push(message);
        } catch (error) {
          console.error("Error processing message:", error, message);
        }
        return groups;
      }, {})
    : {};

  // Convert the grouped messages object to an array and log status
  const messageGroups = Object.keys(groupedMessages).map(date => ({
    date,
    messages: groupedMessages[date]
  }));
  
  console.log(`Created ${messageGroups.length} message groups`);
  if (messageGroups.length === 0 && !loading) {
    console.log("No message groups created even though loading is complete");
  }

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

  return (    <SafeScreenWrapper style={styles.safeArea}>
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
        <View style={styles.messagesWrapper}>        {loading ? (
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
                {Array.isArray(item.messages) && 
                  item.messages.map((message, index) => 
                    <React.Fragment key={`${item.date}-${message.id || index}`}>
                      {renderMessage({ item: message })}
                    </React.Fragment>
                  )
                }
              </>
            )}
            contentContainerStyle={[
              styles.messagesContainer,
              messageGroups.length === 0 && styles.emptyMessagesContainer
            ]}            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => {
                    console.log("Manually retrying message loading for recipient:", recipientId);
                    setLoading(true);
                    
                    // Prevent self-messaging retries which will always fail
                    if (user && user.id === recipientId) {
                      console.error("Cannot retry messaging yourself - returning to previous screen");
                      Alert.alert(
                        "Invalid Action", 
                        "You cannot send messages to yourself.",
                        [{ text: "OK", onPress: () => router.back() }]
                      );
                      setLoading(false);
                      return;
                    }                    // Ensure we have a valid user before attempting retry
                    if (!hasValidAuth) {
                      console.error("Cannot retry - no authenticated user or invalid user ID");
                      Alert.alert(
                        "Authentication Error", 
                        "Please sign in again to send messages.",
                        [{ text: "OK", onPress: () => router.replace('/(auth)/auth-options') }]
                      );
                      setLoading(false);
                      return;
                    }
                    
                    // Parse user ID to ensure it's a valid number
                    const currentUserId = parseInt(user.id, 10);
                    if (isNaN(currentUserId)) {
                      console.error("User ID is not a valid number:", user.id);
                      Alert.alert(
                        "Authentication Error", 
                        "Your user account has invalid data. Please sign out and sign in again.",
                        [{ text: "OK", onPress: () => router.replace('/(auth)/auth-options') }]
                      );
                      setLoading(false);
                      return;
                    }
                      console.log(`Retrying message load with user ID: ${currentUserId}, recipient ID: ${recipientId}`);
                    // Extra validation before retrying
                    if (!currentUserId || isNaN(parseInt(currentUserId, 10)) || 
                        !recipientId || isNaN(parseInt(recipientId, 10))) {
                      Alert.alert(
                        "Error", 
                        "Missing user information. Please reload the app and try again."
                      );
                      setLoading(false);
                      return;
                    }
                    messagesAPI.getMessages(currentUserId, recipientId)
                      .then(data => {
                        console.log(`Retry got ${data ? data.length : 'no'} messages`);
                        setMessages(Array.isArray(data) ? data : []);
                        if (Array.isArray(data) && data.length > 0) {
                          Alert.alert("Success", `Loaded ${data.length} messages`);
                        } else {
                          console.log("No messages found on retry");
                        }
                        setLoading(false);
                      })
                      .catch(err => {
                        console.error("Retry failed:", err);
                        
                        // Special handling for self-messaging errors
                        if (err.isSelfMessagingError || 
                            err.message?.includes('self') ||
                            err.response?.data?.code === 'SELF_MESSAGING_NOT_ALLOWED') {
                          Alert.alert(
                            "Invalid Action", 
                            "You cannot send messages to yourself.",
                            [{ text: "OK", onPress: () => router.back() }]
                          );
                        } else {
                          // Generic error handling
                          Alert.alert(
                            "Error", 
                            "Failed to refresh messages. Please try again.",
                            [
                              { text: "Try Again", onPress: () => {
                                // Just trigger the retry logic again
                                setLoading(true);                                // Double check that user is available with valid auth
                                if (!hasValidAuth) {
                                  console.error("Cannot retry - no authenticated user or invalid user ID");
                                  Alert.alert(
                                    "Authentication Error", 
                                    "Please sign in again to send messages.",
                                    [{ text: "OK", onPress: () => router.replace('/(auth)/auth-options') }]
                                  );
                                  setLoading(false);
                                  return;
                                }
                                
                                // Parse user ID again to be extra safe
                                const currentUserId = parseInt(user.id, 10);
                                if (isNaN(currentUserId)) {
                                  console.error("User ID is not a valid number in second retry:", user.id);
                                  Alert.alert(
                                    "Authentication Error", 
                                    "Your user account has invalid data. Please sign out and sign in again.",
                                    [{ text: "OK", onPress: () => router.replace('/(auth)/auth-options') }]
                                  );
                                  setLoading(false);
                                  return;
                                }
                                  console.log(`Second retry with user ID: ${currentUserId}, recipient ID: ${recipientId}`);
                                // Extra validation before second retry
                                if (!currentUserId || isNaN(parseInt(currentUserId, 10)) || 
                                    !recipientId || isNaN(parseInt(recipientId, 10))) {
                                  Alert.alert(
                                    "Error", 
                                    "Missing user information. Please reload the app and try again."
                                  );
                                  setLoading(false);
                                  return;
                                }
                                messagesAPI.getMessages(currentUserId, recipientId)
                                  .then(data => {
                                    setMessages(Array.isArray(data) ? data : []);
                                    setLoading(false);
                                  })
                                  .catch(e => {
                                    console.error("Second retry failed:", e);
                                    setLoading(false);
                                  });
                              }},
                              { text: "Cancel", style: "cancel" }
                            ]
                          );
                        }
                        setLoading(false);
                      });
                  }}
                >
                  <Ionicons name="refresh-outline" size={24} color="#0077B6" />
                  <Text style={styles.retryText}>Tap to refresh</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View><KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 30}
        style={{ flex: 0.2, marginTop: 10 }}
      >
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.attachButton}>
              <Ionicons name="attach" size={24} color="#44DBE9" />
            </TouchableOpacity>
            
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              multiline
              maxHeight={100}
              autoCapitalize="sentences"
              autoCorrect={true}
              blurOnSubmit={false}
              returnKeyType="default"
            />
            
            <TouchableOpacity
              style={[styles.sendButton, newMessage.trim() ? styles.activeSendButton : styles.disabledSendButton]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim()}
              activeOpacity={0.7}
            >
              <Ionicons name="send" size={20} color={newMessage.trim() ? "#ffffff" : "#999"} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  messagesWrapper: {
    flex: 1, 
    backgroundColor: '#f5f5f5',
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
  },
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
  },  messagesContainer: {
    padding: 16,
    paddingBottom: 16,
    maxHeight: '75%',
    flex: 1,
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
  },  messageTime: {
    fontSize: 10,
    color: '#999',
    alignSelf: 'flex-end',
    marginTop: 4
  },  inputContainer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    width: '100%',
    marginBottom: 15,
    position: 'relative',
    bottom: 0,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 36,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 5,
    color: '#333',
  },
  attachButton: {
    padding: 5,
    marginRight: 5,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },  activeSendButton: {
    backgroundColor: '#44DBE9',
  },
  disabledSendButton: {
    backgroundColor: '#e0e0e0',
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
  },  emptyContainer: {
    flex: 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50
  },
  emptyText: {
    color: '#666',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20
  },
  retryButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10
  },
  retryText: {
    color: '#0077B6',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 5
  }
});

export default MessagingScreen;
