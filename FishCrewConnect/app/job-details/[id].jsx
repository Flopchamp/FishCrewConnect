import React, { useEffect, useState, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { jobsAPI, applicationsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import SafeScreenWrapper from '../../components/SafeScreenWrapper';
import HeaderBox from '../../components/HeaderBox';
import CustomButton from '../../components/CustomButton';
import ReviewItem from '../../components/ReviewItem';

const JobDetailsScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const jobId = id;
  
  // State variables
  const [job, setJob] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  
  // Load job details, owner info, application status, and reviews
  const loadJobDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get job details from database
      const jobData = await jobsAPI.getJobById(jobId);
      console.log('Job data loaded:', jobData);
      setJob(jobData);
      
      // Get job owner details
      if (jobData?.user_id) {
        const ownerData = await jobsAPI.getJobOwner(jobData.user_id);
        console.log('Owner data loaded:', ownerData);
        setOwner(ownerData);
        
        // Get reviews for the job owner
        const reviewsData = await jobsAPI.getOwnerReviews(jobData.user_id);
        console.log('Reviews loaded:', reviewsData);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      }
      
      // Check if user has already applied
      if (user && user.user_type === 'fisherman') {
        const applications = await applicationsAPI.getMyApplications();
        const hasAlreadyApplied = applications.some(app => 
          app.job_id === parseInt(jobId)
        );
        setHasApplied(hasAlreadyApplied);
      }
    } catch (error) {
      console.error('Error loading job details:', error);
      setError('Failed to load job details. Please try again.');
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [jobId, user]);
    // Load data when component mounts or when dependencies change
  useEffect(() => {
    if (jobId) {
      loadJobDetails();
    }
  }, [loadJobDetails, jobId]); // Including jobId in dependencies even though it's already in loadJobDetails
  
  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadJobDetails();
  }, [loadJobDetails]);
  // Show cover letter modal
  const showCoverLetterInput = () => {
    setShowCoverLetterModal(true);
  };
  
  // Handle job application
  const handleApply = async () => {
    try {
      setApplying(true);
      // Pass the cover letter with the application
      await applicationsAPI.applyForJob(jobId, { cover_letter: coverLetter });
      setShowCoverLetterModal(false);
      Alert.alert('Success', 'Your application has been submitted');
      setHasApplied(true);
      setCoverLetter(''); // Reset cover letter
    } catch (error) {
      console.error('Error applying for job:', error);
      Alert.alert('Error', 'Failed to submit your application');
    } finally {
      setApplying(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Calculate days left until deadline
  const calculateDaysLeft = (dateString) => {
    if (!dateString) return 'No deadline';
    
    const deadline = new Date(dateString);
    const today = new Date();
    
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Last day!';
    return `${diffDays} days left`;
  };
  
  // Determine if current user is job owner
  const isJobOwner = user && job && user.id === job.user_id;
  
  // Determine if user can apply for this job
  const canApply = user && 
                  user.user_type === 'fisherman' && 
                  job?.status === 'open' && 
                  !hasApplied && 
                  !isJobOwner;
  
  // Show loading indicator during initial load
  if (loading && !refreshing) {
    return (
      <SafeScreenWrapper>
        <HeaderBox title="Job Details" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0077B6" />
        </View>
      </SafeScreenWrapper>
    );
  }
  
  // Show error message if job failed to load
  if (error && !job) {
    return (
      <SafeScreenWrapper>
        <HeaderBox title="Job Details" showBackButton={true} />
        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#CBD5E0" />
          <Text style={styles.notFoundText}>Error loading job details</Text>
          <CustomButton 
            title="Try Again" 
            onPress={loadJobDetails} 
            style={styles.retryButton} 
          />
        </View>
      </SafeScreenWrapper>
    );
  }
  
  // Show "not found" message if job doesn't exist
  if (!job) {
    return (
      <SafeScreenWrapper>
        <HeaderBox title="Job Details" showBackButton={true} />
        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#CBD5E0" />
          <Text style={styles.notFoundText}>Job not found</Text>
        </View>
      </SafeScreenWrapper>
    );
  }
  
  return (
    <SafeScreenWrapper>
      <HeaderBox 
        title="Job Details" 
        showBackButton={true} 
        rightComponent={
          isJobOwner && (
            <TouchableOpacity 
              onPress={() => router.push(`/edit-job/${jobId}`)} 
              style={styles.editButton}
            >
              <Ionicons name="create-outline" size={20} color="#0077B6" />
            </TouchableOpacity>
          )
        }
      />
      
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Job Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{job.job_title}</Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: job.status === 'open' ? '#4CAF50' : 
                              job.status === 'filled' ? '#2196F3' : 
                              job.status === 'in_progress' ? '#FF9800' :
                              job.status === 'completed' ? '#9C27B0' :
                              '#F44336' }
          ]}>
            <Text style={styles.statusText}>
              {job.status === 'in_progress' ? 'In Progress' : 
               job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </Text>
          </View>
        </View>
        
        {/* Job Location */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color="#666" />
            <Text style={styles.infoText}>{job.location || 'Location not specified'}</Text>
          </View>
        </View>
        
        {/* Job Key Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Posted by</Text>
              <TouchableOpacity 
                onPress={() => router.push(`/profile/${job.user_id}`)}
                style={styles.ownerLink}
              >
                <Text style={styles.ownerName}>{owner?.name || 'Unknown'}</Text>
                <Ionicons name="chevron-forward" size={14} color="#0077B6" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{job.job_duration || 'Not specified'}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Posted on</Text>
              <Text style={styles.detailValue}>{formatDate(job.created_at)}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Deadline</Text>
              <View style={styles.deadlineContainer}>
                <Text style={styles.detailValue}>{formatDate(job.application_deadline)}</Text>
                <Text style={styles.daysLeft}>{calculateDaysLeft(job.application_deadline)}</Text>
              </View>
            </View>
          </View>
          
          {job.payment_details && (
            <View style={styles.paymentRow}>
              <Ionicons name="cash-outline" size={18} color="#4CAF50" />
              <Text style={styles.paymentText}>{job.payment_details}</Text>
            </View>
          )}
        </View>
        
        {/* Job Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>
            {job.description || 'No description provided'}
          </Text>
        </View>
        
        {/* Requirements */}
        {job.requirements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            <Text style={styles.description}>{job.requirements}</Text>
          </View>
        )}
        
        {/* Employer Reviews */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employer Reviews</Text>
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
        {/* Action Button */}
      {canApply && (
        <View style={styles.bottomBar} padding={40}>
          <CustomButton
            title="Apply for this job"
            onPress={() => setShowCoverLetterModal(true)}
            isLoading={applying}
            fullWidth
            icon="paper-plane-outline"
          />
        </View>
      )}
      
      {/* Cover Letter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCoverLetterModal}
        onRequestClose={() => setShowCoverLetterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Application Cover Letter</Text>
            <Text style={styles.modalSubtitle}>Tell us why you&apos;re a good fit for this job (optional)</Text>
            
            <TextInput
              style={styles.coverLetterInput}
              multiline={true}
              numberOfLines={6}
              placeholder="Write your cover letter here..."
              value={coverLetter}
              onChangeText={setCoverLetter}
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowCoverLetterModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleApply}
                disabled={applying}
              >
                {applying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Application</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {hasApplied && (
        <View style={styles.bottomBar}>
          <View style={styles.appliedBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.appliedText}>You have already applied</Text>
          </View>
        </View>
      )}
      
      {isJobOwner && (
        <View style={styles.bottomBar}>
          <CustomButton
            title="View Applications"
            onPress={() => router.push(`/job-applications/${jobId}`)}
            fullWidth
            icon="people-outline"
          />
        </View>
      )}
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  coverLetterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    backgroundColor: '#f9f9f9',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#f2f2f2',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    backgroundColor: '#44DBE9',
    minWidth: 140,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 40,
  },
  notFoundText: {
    fontSize: 18,
    color: '#718096',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3748',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
  },
  detailsCard: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#2D3748',
    fontWeight: '500',
  },
  deadlineContainer: {
    flexDirection: 'column',
  },
  daysLeft: {
    fontSize: 12,
    color: '#F56565',
    marginTop: 2,
    fontWeight: '500',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
  },
  paymentText: {
    marginLeft: 8,
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4A5568',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2D3748',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4A5568',
  },
  ownerLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerName: {
    fontSize: 14,
    color: '#0077B6',
    fontWeight: '500',
  },
  noReviewsText: {
    color: '#718096',
    fontStyle: 'italic',
  },
  bottomBar: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  appliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#E6F7EF',
    borderRadius: 8,
  },
  appliedText: {
    marginLeft: 8,
    color: '#4CAF50',
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 80,
  },
  editButton: {
    padding: 8,
  },
});

export default JobDetailsScreen;
