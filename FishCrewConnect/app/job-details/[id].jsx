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
  Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import SafeScreenWrapper from '../../components/SafeScreenWrapper';
import HeaderBox from '../../components/HeaderBox';
import CustomButton from '../../components/CustomButton';
import ReviewItem from '../../components/ReviewItem';

// Dynamic import for DocumentPicker to handle cases where it's not available
let DocumentPicker = null;
try {
  DocumentPicker = require('expo-document-picker');
} catch (_error) {
  console.warn('expo-document-picker not available, using fallback');
}

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
  const [selectedCV, setSelectedCV] = useState(null);
  const [showFilePickerModal, setShowFilePickerModal] = useState(false);
  const [showFilePreviewModal, setShowFilePreviewModal] = useState(false);
  
  // Load job details, owner info, application status, and reviews
  const loadJobDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get job details from database
      const jobData = await apiService.jobs.getJobById(jobId);
      console.log('Job data loaded:', jobData);
      setJob(jobData);
      
      // Get job owner details
      if (jobData?.user_id) {
        const ownerData = await apiService.jobs.getJobOwner(jobData.user_id);
        console.log('Owner data loaded:', ownerData);
        setOwner(ownerData);
        
        // Get reviews for the job owner
        const reviewsData = await apiService.jobs.getOwnerReviews(jobData.user_id);
        console.log('Reviews loaded:', reviewsData);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      }
      
      // Check if user has already applied
      if (user && user.user_type === 'fisherman') {
        const applications = await apiService.applications.getMyApplications();
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
  
  // Handle file picker
  const pickDocument = async () => {
    try {
      if (DocumentPicker) {
        // Use real document picker if available
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const file = result.assets[0];
          setSelectedCV(file);
          setShowFilePickerModal(false);
          setShowFilePreviewModal(true); // Show preview instead of immediate submission
        }
      } else {
        // Fallback for when DocumentPicker is not available
        Alert.alert(
          'Select CV File',
          'Document picker is not available. Using demo file for testing.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Continue with Demo', 
              onPress: () => {
                const demoFile = {
                  uri: 'demo://cv.pdf',
                  name: 'sample_cv.pdf',
                  mimeType: 'application/pdf',
                  size: 102400 // 100KB
                };
                setSelectedCV(demoFile);
                setShowFilePickerModal(false);
                setShowFilePreviewModal(true); // Show preview for demo file too
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select file');
    }
  };

  // Handle job application with file
  const handleApplyWithFile = async (file) => {
    try {
      setApplying(true);
      await apiService.applications.applyForJob(jobId, file);
      Alert.alert('Success', 'Your application has been submitted with your CV');
      setHasApplied(true);
      setSelectedCV(null);
      setShowFilePreviewModal(false);
    } catch (error) {
      console.error('Error applying for job:', error);
      Alert.alert('Error', 'Failed to submit your application');
    } finally {
      setApplying(false);
    }
  };

  // Handle confirming application submission
  const handleConfirmApplication = async () => {
    if (selectedCV) {
      await handleApplyWithFile(selectedCV);
    }
  };

  // Handle canceling file selection
  const handleCancelFileSelection = () => {
    setSelectedCV(null);
    setShowFilePreviewModal(false);
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle job application
  const handleApply = async () => {
    setShowFilePickerModal(true);
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
          )}        </View>          {/* Job Description */}
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

        {/* Job Owner Actions - Moved to bottom after reviews */}
        {isJobOwner && (
          <View style={styles.ownerActionsSection}>
            <View style={styles.ownerButtonRow}>
              <CustomButton
                title="Edit Job"
                onPress={() => router.push(`/edit-job/${jobId}`)}
                icon="create-outline"
                style={[styles.ownerButton, styles.editJobButton]}
                textStyle={styles.editJobButtonText}
              />
              <CustomButton
                title="View Applications"
                onPress={() => router.push(`/job-applications/${jobId}`)}
                icon="people-outline"
                style={[styles.ownerButton, styles.viewApplicationsButton]}
              />
            </View>
          </View>
        )}
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
        {/* Action Button */}
      {canApply && (
        <View style={styles.bottomBar} padding={40}>
          <CustomButton
            title="Apply for this job"
            onPress={handleApply}
            isLoading={applying}
            fullWidth
            icon="document-outline"
          />
        </View>
      )}
      
      {/* File Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFilePickerModal}
        onRequestClose={() => setShowFilePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Upload Your CV</Text>
            <Text style={styles.modalSubtitle}>Please select your CV/Resume file to apply for this job</Text>
            
            <View style={styles.filePickerContainer}>
              <Ionicons name="document-outline" size={60} color="#44DBE9" />
              <Text style={styles.filePickerText}>
                Upload PDF, DOC, or DOCX files
              </Text>
              <Text style={styles.filePickerSubtext}>
                Maximum file size: 5MB
              </Text>
            </View>
            
            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowFilePickerModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={pickDocument}
                disabled={applying}
              >
                {applying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Select CV File</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* File Preview Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFilePreviewModal}
        onRequestClose={handleCancelFileSelection}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Review Your CV</Text>
            <Text style={styles.modalSubtitle}>Please review your selected file before submitting</Text>
            
            {selectedCV && (
              <View style={styles.filePreviewContainer}>
                <View style={styles.fileIcon}>
                  <Ionicons 
                    name={selectedCV.mimeType?.includes('pdf') ? 'document-text' : 'document'} 
                    size={48} 
                    color="#44DBE9" 
                  />
                </View>
                
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName}>{selectedCV.name}</Text>
                  <Text style={styles.fileSize}>{formatFileSize(selectedCV.size)}</Text>
                  <Text style={styles.fileType}>
                    {selectedCV.mimeType === 'application/pdf' ? 'PDF Document' :
                     selectedCV.mimeType?.includes('word') ? 'Word Document' :
                     'Document'}
                  </Text>
                </View>
              </View>
            )}
            
            <View style={styles.previewActions}>
              <Text style={styles.confirmationText}>
                Are you ready to submit your application with this CV?
              </Text>
              
              <View style={styles.modalButtonRow}>
                <TouchableOpacity 
                  style={[styles.cancelButton, styles.changeFileButton]}
                  onPress={handleCancelFileSelection}
                >
                  <Text style={styles.cancelButtonText}>Change File</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.submitButton}
                  onPress={handleConfirmApplication}
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
  filePickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderWidth: 2,
    borderColor: '#44DBE9',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#f8fcff',
    marginBottom: 20,
  },
  filePickerText: {
    fontSize: 16,
    color: '#44DBE9',
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  filePickerSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  filePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fcff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e3f2fd',
    marginBottom: 20,
  },
  fileIcon: {
    marginRight: 16,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 2,
  },
  fileType: {
    fontSize: 12,
    color: '#44DBE9',
    fontWeight: '500',
  },
  previewActions: {
    marginTop: 8,
  },
  confirmationText: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
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
  },  bottomSpacer: {
    height: 80,
  },
  editButton: {
    padding: 8,
  },
  ownerActionsSection: {
    marginBottom: 24,
    paddingHorizontal: 0,
  },
  ownerButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  ownerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
  },
  editJobButton: {
    backgroundColor: '#e8f5f6',
    borderWidth: 1,
    borderColor: '#44DBE9',
  },
  editJobButtonText: {
    color: '#44DBE9',
    fontWeight: '600',
  },
  employerReviewButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#FFB800',
    marginTop: 8,
  },
  employerReviewButtonText: {
    color: '#FFB800',
    fontWeight: '600',
  },
});

export default JobDetailsScreen;
