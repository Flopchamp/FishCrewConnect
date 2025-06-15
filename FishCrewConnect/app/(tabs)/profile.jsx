import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import SafeScreenWrapper from '../../components/SafeScreenWrapper';
import ProfileCard from '../../components/ProfileCard';
import ReviewItem from '../../components/ReviewItem';
import { userAPI } from '../../services/api';
import HeaderBox from '../../components/HeaderBox';

const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Load user profile data and reviews
  const loadProfileData = useCallback(async (showFullLoadingUI = true) => {
    try {
      if (showFullLoadingUI) {
        setLoading(true);
      }
      setError(null);
      
      // Fetch user profile data from the backend
      const userData = await userAPI.getProfile();
      setProfileData(userData);
      
      // Fetch user reviews if we have a user_id
      if (userData && userData.user_id) {
        const reviewsData = await userAPI.getUserReviews(userData.user_id);
        setReviews(reviewsData || []);
      }
    } catch (error) {
      console.error('Failed to load profile data:', error);
      setError('Failed to load profile data. Please try again.');
      
      // Show error alert
      if (showFullLoadingUI) {
        Alert.alert(
          'Error',
          'Failed to load profile data. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfileData(false);
  }, [loadProfileData]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const handleEditProfile = () => {
    router.push('/edit-profile');
  };
  
  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Logout Failed', 'Unable to log out. Please try again.');
    }
  };
  if (loading && !refreshing) {
    return (
      <SafeScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#44DBE9" />
        </View>
      </SafeScreenWrapper>
    );
  }

  return (
    <SafeScreenWrapper>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#44DBE9']}
          />
        }
      >
        <HeaderBox title="My Profile">
          <TouchableOpacity 
            style={styles.editButton}
            onPress={handleEditProfile}
          >
            <Ionicons name="create-outline" size={20} color="#44DBE9" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </HeaderBox>
        
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={24} color="#ff6b6b" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => loadProfileData()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {profileData && !error && (
          <ProfileCard 
            user={profileData} 
            showRating={true}
          />
        )}
        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          <Text style={styles.reviewCount}>{reviews.length || 0}</Text>
        </View>
        
        {reviews.length > 0 ? (
          reviews.map((review, index) => (
            <ReviewItem key={index} review={review} />
          ))
        ) : (
          <View style={styles.emptyReviews}>
            <Ionicons name="star-outline" size={40} color="#ccc" />
            <Text style={styles.emptyText}>No reviews yet</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#e53935" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#e8f5f6',
  },
  editButtonText: {
    marginLeft: 4,
    color: '#44DBE9',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: '#fff1f1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffdddd',
  },
  errorText: {
    color: '#ff6b6b',
    marginVertical: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  reviewCount: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  emptyReviews: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
  },
  emptyText: {
    marginTop: 12,
    color: '#999',
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffebee',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 32,
  },
  logoutText: {
    color: '#e53935',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ProfileScreen;
