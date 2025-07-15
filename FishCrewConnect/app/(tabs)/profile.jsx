import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import SafeScreenWrapper from '../../components/SafeScreenWrapper';
import ProfileCard from '../../components/ProfileCard';
import ReviewItem from '../../components/ReviewItem';
import apiService from '../../services/api';
import HeaderBox from '../../components/HeaderBox';
import { socketService } from '../../services/socketService';

const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalApplications: 0,
    averageRating: 0,
    totalReviews: 0,
    completedJobs: 0,
    acceptedApplications: 0,
    totalEarnings: 0,
    totalPayments: 0,
    pendingPayments: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Calculate stats based on user data
  const calculateStats = useCallback(async (userData) => {
    try {
      let newStats = {
        totalJobs: 0,
        totalApplications: 0,
        averageRating: 0,
        totalReviews: 0,
        completedJobs: 0,
        acceptedApplications: 0,
        totalEarnings: 0,
        totalPayments: 0,
        pendingPayments: 0
      };

      if (userData && userData.user_id) {
        // Get reviews for rating calculation
        const reviewsData = await apiService.user.getUserReviews(userData.user_id);
        const validReviews = reviewsData || [];
        
        newStats.totalReviews = validReviews.length;
        if (validReviews.length > 0) {
          const totalRating = validReviews.reduce((sum, review) => sum + (review.rating || 0), 0);
          newStats.averageRating = (totalRating / validReviews.length).toFixed(1);
        }

        // Role-specific stats
        if (userData.user_type === 'boat_owner') {
          // For boat owners: get job statistics
          try {
            const jobs = await apiService.jobs.getMyJobs();
            const jobsArray = Array.isArray(jobs) ? jobs : [];
            newStats.totalJobs = jobsArray.length;
            newStats.completedJobs = jobsArray.filter(job => job.status === 'completed').length;
          } catch (error) {
            console.log('Could not fetch jobs for boat owner:', error);
          }
        } else if (userData.user_type === 'fisherman') {
          // For fishermen: get application statistics
          try {
            const applications = await apiService.applications.getMyApplications();
            const appsArray = Array.isArray(applications) ? applications : [];
            newStats.totalApplications = appsArray.length;
            newStats.acceptedApplications = appsArray.filter(app => app.status === 'accepted').length;
          } catch (error) {
            console.log('Could not fetch applications for fisherman:', error);
          }
        }

        // Get payment statistics
        try {
          const paymentsData = await apiService.payments.getPaymentHistory({ page: 1, limit: 100 });
          const validPayments = paymentsData?.payments || [];
          
          newStats.totalPayments = validPayments.length;
          
          // Calculate earnings based on user type
          if (userData.user_type === 'fisherman') {
            // For fishermen, sum up fisherman_amount from completed payments
            newStats.totalEarnings = validPayments
              .filter(payment => payment.status === 'completed')
              .reduce((sum, payment) => sum + parseFloat(payment.fisherman_amount || 0), 0);
            
            // Count pending payments for fishermen
            newStats.pendingPayments = validPayments.filter(payment => payment.status === 'pending').length;
          } else if (userData.user_type === 'boat_owner') {
            // For boat owners, sum up total_amount from completed payments
            newStats.totalPayments = validPayments
              .filter(payment => payment.status === 'completed')
              .reduce((sum, payment) => sum + parseFloat(payment.total_amount || 0), 0);
            
            // Show total paid instead of earnings for boat owners
            newStats.totalEarnings = newStats.totalPayments;
            
            // Count pending payments for boat owners
            newStats.pendingPayments = validPayments.filter(payment => payment.status === 'pending').length;
          }
        } catch (error) {
          console.log('Could not fetch payments:', error);
        }
      }

      setStats(newStats);
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  }, []);

  // Load user profile data and reviews
  const loadProfileData = useCallback(async (showFullLoadingUI = true) => {
    try {
      if (showFullLoadingUI) {
        setLoading(true);
      }
      setError(null);
      
      // Fetch user profile data from the backend
      const userData = await apiService.user.getProfile();
      setProfileData(userData);
      
      // Fetch user reviews and calculate stats
      if (userData && userData.user_id) {
        const reviewsData = await apiService.user.getUserReviews(userData.user_id);
        setReviews(reviewsData || []);
        
        // Calculate statistics
        await calculateStats(userData);
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
  }, [calculateStats]);

  // Set up Socket.IO listeners for real-time updates
  useEffect(() => {
    if (user && user.id) {
      const socket = socketService.getSocket();
      
      if (socket) {
        // Listen for review updates
        const handleReviewCreated = (data) => {
          if (data.reviewed_user_id === user.id) {
            console.log('New review received, refreshing profile...');
            loadProfileData(false);
          }
        };

        // Listen for job updates (for boat owners)
        const handleJobCreated = () => {
          if (user.user_type === 'boat_owner') {
            console.log('Job created, refreshing stats...');
            loadProfileData(false);
          }
        };

        // Listen for application updates (for fishermen)
        const handleApplicationCreated = (data) => {
          if (data.user_id === user.id) {
            console.log('Application created, refreshing stats...');
            loadProfileData(false);
          }
        };

        socket.on('review_created', handleReviewCreated);
        socket.on('job_created', handleJobCreated);
        socket.on('application_created', handleApplicationCreated);

        // Cleanup listeners
        return () => {
          socket.off('review_created', handleReviewCreated);
          socket.off('job_created', handleJobCreated);
          socket.off('application_created', handleApplicationCreated);
        };
      }
    }
  }, [user, loadProfileData]);

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

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => signOut()
        }
      ]
    );
  };

  const handleSupportContact = () => {
    const email = 'support@fishcrewconnect.com';
    const subject = 'Support Request';
    const body = 'Hello, I need help with...';
    
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
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

        {/* Profile Overview Section */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Profile Overview</Text>
          
          <View style={styles.statsGrid}>
            {user?.user_type === 'boat_owner' ? (
              <>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.totalJobs}</Text>
                  <Text style={styles.statLabel}>Total Jobs</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.completedJobs}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>KSH {stats.totalEarnings.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Total Paid</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.pendingPayments}</Text>
                  <Text style={styles.statLabel}>Pending Payments</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.totalApplications}</Text>
                  <Text style={styles.statLabel}>Applications</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.acceptedApplications}</Text>
                  <Text style={styles.statLabel}>Accepted</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>KSH {stats.totalEarnings.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Total Earned</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.pendingPayments}</Text>
                  <Text style={styles.statLabel}>Pending Payments</Text>
                </View>
              </>
            )}
            
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.averageRating || '0.0'}</Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalReviews}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Section */}
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          {user?.user_type === 'boat_owner' ? (
            <>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/create-job')}
              >
                <Ionicons name="add-circle-outline" size={24} color="#44DBE9" />
                <Text style={styles.actionText}>Post New Job</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/payment-history')}
              >
                <Ionicons name="card-outline" size={24} color="#4CAF50" />
                <Text style={styles.actionText}>Payment History</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/(tabs)/')}
              >
                <Ionicons name="search-outline" size={24} color="#44DBE9" />
                <Text style={styles.actionText}>Browse Jobs</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/payment-history')}
              >
                <Ionicons name="card-outline" size={24} color="#4CAF50" />
                <Text style={styles.actionText}>Payment History</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            </>
          )}
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/my-applications')}
          >
            <Ionicons name="document-text-outline" size={24} color="#44DBE9" />
            <Text style={styles.actionText}>My Applications</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
        
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

        {/* Support Section */}
        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>Need Help?</Text>
          <Text style={styles.supportText}>Access user guides and get support</Text>
          
          <TouchableOpacity 
            style={styles.supportButton}
            onPress={() => router.push('/help-center')}
          >
            <Ionicons name="help-circle-outline" size={20} color="#44DBE9" />
            <Text style={styles.supportButtonText}>Help Center</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.supportButton, { marginTop: 8 }]}
            onPress={handleSupportContact}
          >
            <Ionicons name="mail-outline" size={20} color="#44DBE9" />
            <Text style={styles.supportButtonText}>Email Support</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#e53935" />
          <Text style={styles.logoutText}>Sign Out</Text>
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
  overviewCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#44DBE9',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actionsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
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
  supportCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  supportText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5f6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  supportButtonText: {
    marginLeft: 8,
    color: '#44DBE9',
    fontWeight: '500',
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
