import React, { useEffect, useState, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import SafeScreenWrapper from '../../components/SafeScreenWrapper';
import HeaderBox from '../../components/HeaderBox';
import DefaultProfileImage from '../../components/DefaultProfileImage';
import ReviewItem from '../../components/ReviewItem';

const ProfileScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const userId = id;
    // State variables
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Load profile data
  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get user profile data
      const profileData = await apiService.jobs.getJobOwner(userId);
      console.log('Profile data loaded:', profileData);
      setProfile(profileData);
      
      // Get user's reviews
      try {
        const reviewsData = await apiService.jobs.getOwnerReviews(userId);
        console.log('Reviews loaded:', reviewsData);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      } catch (reviewError) {
        console.log('No reviews found or error loading reviews:', reviewError);
        setReviews([]);
      }
        // Get user's recent jobs (if they're a boat owner)
      // Note: Future enhancement - could show user's recent job postings
      
    } catch (error) {
      console.error('Error loading profile data:', error);
      setError('Failed to load profile data. Please try again.');
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);
  
  // Load data when component mounts
  useEffect(() => {
    if (userId) {
      loadProfileData();
    }
  }, [loadProfileData, userId]);
  
  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfileData();
  }, [loadProfileData]);
  
  // Handle message user
  const handleMessageUser = () => {
    if (!profile) return;
    
    router.push({
      pathname: '/messaging',
      params: {
        recipientId: profile.user_id,
        recipientName: profile.name,
        recipientProfileImage: profile.profile_image
      }
    });
  };
  
  // Calculate average rating
  const calculateAverageRating = () => {
    if (!reviews || reviews.length === 0) return 0;
    const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    return (totalRating / reviews.length).toFixed(1);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Show loading indicator during initial load
  if (loading && !refreshing) {
    return (
      <SafeScreenWrapper>
        <HeaderBox title="Profile" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0077B6" />
        </View>
      </SafeScreenWrapper>
    );
  }
  
  // Show error message if profile failed to load
  if (error && !profile) {
    return (
      <SafeScreenWrapper>
        <HeaderBox title="Profile" showBackButton={true} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#CBD5E0" />
          <Text style={styles.errorText}>Error loading profile</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadProfileData}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeScreenWrapper>
    );
  }
  
  // Show "not found" message if profile doesn't exist
  if (!profile) {
    return (
      <SafeScreenWrapper>
        <HeaderBox title="Profile" showBackButton={true} />
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={64} color="#CBD5E0" />
          <Text style={styles.errorText}>Profile not found</Text>
        </View>
      </SafeScreenWrapper>
    );
  }
  
  return (
    <SafeScreenWrapper>
      <HeaderBox title="Profile" showBackButton={true} />
      
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <DefaultProfileImage 
            size={80} 
            imageUrl={profile.profile_image} 
          />
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.userType}>
              {profile.user_type === 'boat_owner' ? 'Boat Owner' : 'Fisherman'}
            </Text>
            {profile.organization_name && (
              <Text style={styles.organization}>{profile.organization_name}</Text>
            )}
            <Text style={styles.memberSince}>
              Member since {formatDate(profile.created_at)}
            </Text>
          </View>
        </View>
        
        {/* Action Buttons */}
        {user && user.id !== profile.user_id && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.messageButton}
              onPress={handleMessageUser}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#fff" />
              <Text style={styles.messageButtonText}>Send Message</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Profile Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{reviews.length}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          {reviews.length > 0 && (
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{calculateAverageRating()}</Text>
              <Text style={styles.statLabel}>Rating</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= Math.round(calculateAverageRating()) ? "star" : "star-outline"}
                    size={16}
                    color="#FFD700"
                  />
                ))}
              </View>
            </View>
          )}
        </View>
        
        {/* Contact Information */}
        {profile.email && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={18} color="#666" />
              <Text style={styles.contactText}>{profile.email}</Text>
            </View>
          </View>
        )}
        
        {/* Bio/Description */}
        {profile.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}
        
        {/* Reviews Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
          {reviews && reviews.length > 0 ? (
            reviews.map((review) => (
              <ReviewItem key={review.id} review={review} />
            ))
          ) : (
            <Text style={styles.noReviewsText}>No reviews yet</Text>
          )}
        </View>
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#718096',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#0077B6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  profileHeader: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 4,
  },
  userType: {
    fontSize: 16,
    color: '#0077B6',
    fontWeight: '500',
    marginBottom: 4,
  },
  organization: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 12,
    color: '#999',
  },
  actionButtonsContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  messageButton: {
    backgroundColor: '#0077B6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0077B6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#4A5568',
  },
  bioText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4A5568',
  },
  noReviewsText: {
    color: '#718096',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default ProfileScreen;
