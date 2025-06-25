import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { applicationsAPI } from '../services/api';


const ApplicationItem = ({ application, isOwner = false }) => {
  const router = useRouter();
  
  // Get application status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return '#4CAF50'; // Green
      case 'rejected':
        return '#F44336'; // Red
      case 'shortlisted':
        return '#2196F3'; // Blue
      case 'withdrawn':
        return '#9E9E9E'; // Grey
      case 'pending':
      default:
        return '#FF9800'; // Orange
    }
  };

  // Format the application date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };  
  // Format file size for display
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle view application details
  const handleViewDetails = () => {
    // Log the application data and user role for debugging
    console.log('Application data:', application);
    console.log('Is owner (boat owner):', isOwner);
    
    if (isOwner) {
      // For boat owners: navigate to see details of all applications for this job
      const jobId = application.job_id;
      console.log(`Boat owner navigating to job applications, job ID: ${jobId}`);
      router.push(`/job-applications/${jobId}`);
    } else {
      // For fishermen: view the job details they applied to
      console.log(`Fisherman viewing job details, job ID: ${application.job_id}`);
      router.push(`/job-details/${application.job_id}`);
    }
  };
    // Handle message applicant
  const handleMessageApplicant = () => {
    if (isOwner && (application.user_id || application.applicant_id)) {
      router.push({
        pathname: '/messaging',
        params: {
          recipientId: application.user_id || application.applicant_id,
          recipientName: application.applicant_name || application.username || 'Applicant',
          recipientProfileImage: application.profile_image_url || null
        }
      });
    }
  };
  // Handle review submission
  const handleReviewUser = () => {
    if (isOwner) {
      // Boat owner reviewing fisherman
      router.push({
        pathname: '/submit-review',
        params: {
          userId: application.user_id || application.applicant_id,
          jobId: application.job_id,
          recipientName: application.applicant_name || application.username || 'Fisherman',
          jobTitle: application.job_title,
          reviewed_user_id: application.user_id || application.applicant_id
        }
      });
    } else {
      // Fisherman reviewing boat owner
      router.push({
        pathname: '/submit-review',
        params: {
          userId: application.job_owner_id || application.owner_id,
          jobId: application.job_id,
          recipientName: application.owner_name || 'Boat Owner',
          jobTitle: application.job_title,
          reviewed_user_id: application.job_owner_id || application.owner_id
        }
      });
    }
  };

  // Check if review is possible (job completed and application accepted)
  const canReview = () => {
    return application.job_status === 'completed' && 
           application.status === 'accepted' && 
           !application.has_reviewed; // Assuming we track if user has already reviewed
  };

  // Handle CV download
  const handleDownloadCV = async () => {
    if (!application.cv_file_url) {
      Alert.alert('Error', 'CV file not available');
      return;
    }

    try {
      Alert.alert(
        'CV Options',
        `What would you like to do with ${application.applicant_name || 'this applicant'}'s CV?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'View CV', 
            onPress: async () => {
              try {
                // For web/development, we can open in a new tab
                if (typeof window !== 'undefined') {
                  window.open(application.cv_file_url, '_blank');
                } else {
                  // For mobile, you would use a file viewer or WebBrowser
                  Alert.alert('Info', 'CV viewing will open in browser');
                }
              } catch (_error) {
                Alert.alert('Error', 'Failed to open CV');
              }
            }
          },
          { 
            text: 'Download', 
            onPress: async () => {
              try {
                await applicationsAPI.downloadCV(application.id);
                Alert.alert('Success', 'CV download started');
              } catch (_error) {
                Alert.alert('Error', 'Failed to download CV');
              }
            }
          }
        ]
      );
    } catch (_error) {
      console.error('Error handling CV:', _error);
      Alert.alert('Error', 'Failed to access CV');
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleViewDetails}>
      <View style={styles.header}>
        <Text style={styles.jobTitle}>{application.job_title || 'Job'}</Text>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: getStatusColor(application.status) }
        ]}>
          <Text style={styles.statusText}>{application.status || 'Pending'}</Text>
        </View>
      </View>
      
      <View style={styles.locationContainer}>
        <Ionicons name="location-outline" size={16} color="#666" />
        <Text style={styles.locationText}>{application.location || 'Location not specified'}</Text>
      </View>
      
      {/* CV Section */}
      {application.cv_file_name && (
        <View style={styles.cvContainer}>
          <View style={styles.cvIcon}>
            <Ionicons 
              name={application.cv_file_name?.toLowerCase().includes('.pdf') ? 'document-text' : 'document'} 
              size={20} 
              color="#44DBE9" 
            />
          </View>
          <View style={styles.cvFileInfo}>
            <Text style={styles.cvFileName}>{application.cv_file_name}</Text>
            {application.cv_file_size && (
              <Text style={styles.cvFileSize}>
                {formatFileSize(application.cv_file_size)}
              </Text>
            )}
          </View>
          {isOwner && (
            <TouchableOpacity 
              style={styles.downloadButton}
              onPress={handleDownloadCV}
            >
              <Ionicons name="eye-outline" size={16} color="#fff" />
              <Text style={styles.downloadText}>View</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      <View style={styles.footer}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.dateText}>Applied on {formatDate(application.application_date)}</Text>        </View>
          {(isOwner || canReview()) && (
          <View style={styles.actionButtons}>
            {isOwner && (
              <>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.viewButton]}
                  onPress={handleViewDetails}
                >
                  <Text style={styles.viewButtonText}>View Details</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, styles.messageButton]}
                  onPress={handleMessageApplicant}
                >
                  <Ionicons name="chatbubble-outline" size={16} color="#0077B6" />
                  <Text style={styles.messageButtonText}>Message</Text>
                </TouchableOpacity>

                {canReview() && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.reviewButton]}
                    onPress={handleReviewUser}
                  >
                    <Ionicons name="star-outline" size={16} color="#FF9800" />
                    <Text style={styles.reviewButtonText}>Review</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {!isOwner && canReview() && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.reviewButton]}
                onPress={handleReviewUser}
              >
                <Ionicons name="star-outline" size={16} color="#FF9800" />
                <Text style={styles.reviewButtonText}>Review Boat Owner</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    marginLeft: 4,
    color: '#666',
    fontSize: 14,
  },
  cvContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fcff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  cvIcon: {
    marginRight: 8,
  },
  cvFileInfo: {
    flex: 1,
  },
  cvFileName: {
    color: '#44DBE9',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  cvFileSize: {
    color: '#718096',
    fontSize: 12,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#44DBE9',
    borderRadius: 4,
  },
  downloadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    marginLeft: 4,
    color: '#666',
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },  viewButton: {
    backgroundColor: '#E8F5F6',
  },
  viewButtonText: {
    color: '#0077B6',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0077B6',
  },
  messageButtonText: {
    color: '#0077B6',
    marginLeft: 4,
  },  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  reviewButtonText: {
    color: '#FF9800',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ApplicationItem;
