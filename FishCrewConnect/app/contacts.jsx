import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SafeScreenWrapper from '../components/SafeScreenWrapper';
import HeaderBox from '../components/HeaderBox';
import DefaultProfileImage from '../components/DefaultProfileImage';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ContactsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  // Load contacts from the real API
  useEffect(() => {
    const loadContacts = async () => {
      try {
        setLoading(true);
        // Get real contacts from the API
        const data = await userAPI.getContacts();
        setContacts(data);
        setFilteredContacts(data);
      } catch (error) {
        console.error('Error loading contacts:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadContacts();
  }, []);
  
  // Filter contacts based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContacts(contacts);
      return;
    }
    
    const query = searchQuery.toLowerCase().trim();
    const filtered = contacts.filter(
      contact => contact.name.toLowerCase().includes(query) || 
                 contact.location.toLowerCase().includes(query)
    );
    
    setFilteredContacts(filtered);
  }, [searchQuery, contacts]);
  
  const getEmptyStateMessage = () => {
    if (user?.user_type === 'fisherman') {
      return 'No boat owners to message yet';
    } else if (user?.user_type === 'boat_owner') {
      return 'No fishermen to message yet';
    }
    return 'No contacts available';
  };
  
  const getEmptyStateSubMessage = () => {
    if (user?.user_type === 'fisherman') {
      return 'Apply for jobs to start messaging boat owners';
    } else if (user?.user_type === 'boat_owner') {
      return 'Wait for fishermen to apply to your jobs to start messaging';
    }
    return '';
  };
  
  const navigateToChat = (contact) => {
    router.push({
      pathname: '/messaging',
      params: {
        recipientId: contact.id,
        recipientName: contact.name,
        recipientProfileImage: contact.profileImage
      }
    });
  };
  
  const renderContactItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.contactItem} 
      onPress={() => navigateToChat(item)}
    >
      <View style={styles.avatarContainer}>
        {item.profileImage ? (
          <Image 
            source={{ uri: item.profileImage }} 
            style={styles.avatar} 
          />
        ) : (
          <DefaultProfileImage size={50} />
        )}
      </View>
      
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        {item.organization_name && (
          <Text style={styles.organizationName}>{item.organization_name}</Text>
        )}
        <View style={styles.contactDetails}>
          <Text style={styles.contactType}>
            {item.userType === 'boat_owner' ? 'Boat Owner' : 'Fisherman'}
          </Text>
          <Text style={styles.contactLocation}>{item.location}</Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.messageButton} onPress={() => navigateToChat(item)}>
        <Ionicons name="chatbubble-outline" size={20} color="#0077B6" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeScreenWrapper>
      <HeaderBox title="New Message" />
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0077B6" />
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          renderItem={renderContactItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No matching contacts' : getEmptyStateMessage()}
              </Text>
              {!searchQuery && (
                <Text style={styles.emptySubText}>
                  {getEmptyStateSubMessage()}
                </Text>
              )}
            </View>
          }
        />
      )}
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  listContainer: {
    flexGrow: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
  },
  organizationName: {
    fontSize: 14,
    color: '#0077B6',
    fontWeight: '500',
    marginTop: 2,
  },
  contactDetails: {
    flexDirection: 'row',
    marginTop: 4,
  },
  contactType: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  contactLocation: {
    fontSize: 14,
    color: '#999',
  },
  messageButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default ContactsScreen;
