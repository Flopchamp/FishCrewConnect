import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { applicationsAPI, jobsAPI } from '../../services/api';
import SafeScreenWrapper from '../../components/SafeScreenWrapper';
import HeaderBox from '../../components/HeaderBox';
import DefaultProfileImage from '../../components/DefaultProfileImage';

const JobApplicationsScreen = () => {
  const { id: jobId } = useLocalSearchParams();
  const router = useRouter();
  
  const [applications, setApplications] = useState([]);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [sortBy, setSortBy] = useState('date'); // 'date', 'name', 'status'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
    const loadApplications = useCallback(async () => {
    if (!jobId) {
      console.error('No job ID provided');
      Alert.alert('Error', 'Invalid job ID');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get job details
      const jobData = await jobsAPI.getJobById(jobId);
      console.log('Fetched job data:', jobData);
      setJob(jobData);
      
      // Get applications for this job
      const applicationsData = await applicationsAPI.getJobApplications(jobId);
      console.log('Fetched applications data:', applicationsData);
      setApplications(applicationsData || []);
    } catch (error) {
      console.error('Failed to load applications:', error);
      Alert.alert('Error', 'Failed to load applications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [jobId]);
  
  useEffect(() => {
    if (jobId) {
      loadApplications();
    }
  }, [jobId, loadApplications]);
  
  const onRefresh = () => {
    setRefreshing(true);
    loadApplications();
  };
    const updateApplicationStatus = async (applicationId, status) => {
    try {
      setUpdatingStatus(applicationId);
      await applicationsAPI.updateApplicationStatus(applicationId, status);
      
      // Update local state
      setApplications(applications.map(app => 
        app.id === applicationId ? { ...app, status } : app
      ));
      
      // Show different messages based on status
      let message = `Application status updated to ${status}`;
      if (status === 'accepted') {
        message = 'Application accepted! The applicant has been notified.';
      } else if (status === 'rejected') {
        message = 'Application rejected. The applicant has been notified.';
      } else if (status === 'shortlisted') {
        message = 'Application shortlisted! The applicant has been notified.';
      } else if (status === 'viewed') {
        message = 'Application marked as viewed.';
      }
      
      Alert.alert('Success', message);
    } catch (error) {
      console.error('Error updating application status:', error);
      Alert.alert('Error', 'Failed to update application status');
    } finally {
      setUpdatingStatus(null);
    }
  };
  
  const handleMessageApplicant = (application) => {
    // Navigate to messaging screen with this applicant
    router.push({
      pathname: '/messaging',
      params: {
        recipientId: application.user_id,
        recipientName: application.applicant_name,
        recipientProfileImage: null // Most likely we don't have this info yet
      }
    });
  };
  
  // Handle CV viewing
  const handleViewCV = async (application) => {
    console.log('=== CV Debug Info ===');
    console.log('CV file URL:', application.cv_file_url);
    console.log('CV file name:', application.cv_file_name);
    console.log('Full application data:', JSON.stringify(application, null, 2));
    
    if (!application.cv_file_url) {
      Alert.alert('CV Not Available', 'This applicant has not uploaded a CV file.');
      return;
    }

    try {
      // Construct the full URL if it's a relative path
      let cvUrl = application.cv_file_url;
      if (cvUrl && !cvUrl.startsWith('http')) {
        const { API_URL } = require('../../config/api');
        // Don't double-encode - if the URL already contains encoded characters, use as-is
        cvUrl = `${API_URL}${cvUrl}`;
      }
      
      console.log('Final CV URL:', cvUrl);

      // Directly open the CV without showing options
      try {
        if (cvUrl) {
          console.log('Opening CV URL:', cvUrl);
          await Linking.openURL(cvUrl);
        } else {
          Alert.alert('Error', 'CV URL not available');
        }
      } catch (_error) {
        console.error('Error opening CV:', _error);
        Alert.alert('Error', `Failed to open CV: ${_error.message || 'Unknown error'}`);
      }
    } catch (_error) {
      console.error('Error handling CV:', _error);
      Alert.alert('Error', `Failed to handle CV: ${_error.message || 'Unknown error'}`);
    }
  };
  
  // Handle reviewing an applicant
  const handleReviewApplicant = (item) => {
    router.push({
      pathname: '/submit-review',
      params: {
        userId: item.user_id,
        jobId: jobId,
        recipientName: item.applicant_name,
        jobTitle: job?.job_title || 'Job',
        reviewed_user_id: item.user_id
      }
    });
  };

  // Check if review is possible (job completed and applicant was accepted)
  const canReviewApplicant = (item) => {
    return job?.status === 'completed' && 
           item.status === 'accepted' && 
           !item.has_reviewed; // Assuming we track if review has been given
  };

  // Get status color based on status value
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#ffc107'; // Yellow
      case 'viewed':
        return '#2196f3'; // Blue
      case 'shortlisted':
        return '#9c27b0'; // Purple
      case 'accepted':
        return '#4caf50'; // Green
      case 'rejected':
        return '#f44336'; // Red
      default:
        return '#757575'; // Gray
    }
  };

  const renderApplicationItem = ({ item }) => {
    // Format the application date
    const formatDate = (dateString) => {
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    };

    return (
      <View style={styles.applicationCard}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusBadgeText}>{item.status.toUpperCase()}</Text>
        </View>
        
        <View style={styles.applicantHeader}>          <View style={styles.applicantInfo}>
            <DefaultProfileImage size={48} imageUrl={item.profile_image_url} />
            <View style={styles.applicantDetails}>
              <Text style={styles.applicantName}>{item.applicant_name}</Text>
              <Text style={styles.applicantEmail}>{item.applicant_email}</Text>
              <View style={styles.applicationMeta}>
                <Ionicons name="calendar-outline" size={14} color="#666" />
                <Text style={styles.applicationDate}>Applied: {formatDate(item.application_date)}</Text>
              </View>
            </View>
          </View>
            
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.messageButtonEnhanced}
              onPress={() => handleMessageApplicant(item)}
            >
              <View style={styles.messageButtonContent}>
                <Ionicons name="chatbubble-outline" size={20} color="white" />
                <Text style={styles.messageButtonText}>Message</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                item.cv_file_url ? styles.cvButtonEnhanced : styles.cvButtonDisabled
              ]}
              onPress={() => handleViewCV(item)}
              disabled={!item.cv_file_url}
            >
              <View style={styles.messageButtonContent}>
                <Ionicons 
                  name={item.cv_file_url ? "document-text-outline" : "document-outline"} 
                  size={20} 
                  color={item.cv_file_url ? "white" : "#999"} 
                />
                <Text style={[
                  styles.messageButtonText,
                  !item.cv_file_url && styles.disabledButtonText
                ]}>
                  {item.cv_file_url ? 'View CV' : 'No CV'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
            {(item.experience_years || item.skills) && (
        <View style={styles.applicantInfoContainer}>
          {item.experience_years && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Experience:</Text>
              <Text style={styles.infoValue}>{item.experience_years} {parseInt(item.experience_years) === 1 ? 'year' : 'years'}</Text>
            </View>
          )}
          
          {item.skills && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Skills:</Text>
              <Text style={styles.infoValue}>{item.skills}</Text>
            </View>
          )}
          
          {item.bio && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Bio:</Text>
              <Text style={styles.infoValue} numberOfLines={3}>{item.bio}</Text>
            </View>
          )}
        </View>
      )}
      
      {item.cover_letter && (
        <View style={styles.coverLetterContainer}>
          <Text style={styles.sectionTitle}>Cover Letter</Text>
          <Text style={styles.coverLetterText}>{item.cover_letter}</Text>
        </View>
      )}
        
        <View style={styles.statusContainer}>
          <Text style={styles.sectionTitle}>Update Status</Text>
          <View style={styles.statusButtonsRow}>
            {["pending", "viewed", "shortlisted", "accepted", "rejected"].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusButton,
                  item.status === status && styles.activeStatusButton,
                  { opacity: updatingStatus === item.id ? 0.7 : 1 }
                ]}
                onPress={() => updateApplicationStatus(item.id, status)}
                disabled={updatingStatus === item.id || item.status === status}
              >
                {updatingStatus === item.id && status === item.status ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text 
                    style={[
                      styles.statusButtonText,
                      item.status === status && styles.activeStatusButtonText
                    ]}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                )}
              </TouchableOpacity>            ))}
          </View>
          
          {/* Review Button - Show only if job is completed and applicant was accepted */}
          {canReviewApplicant(item) && (
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => handleReviewApplicant(item)}
            >
              <Ionicons name="star-outline" size={20} color="#FF9800" />
              <Text style={styles.reviewButtonText}>Review Fisherman</Text>
            </TouchableOpacity>
          )}
        </View>

        {canReviewApplicant(item) && (
          <TouchableOpacity 
            style={styles.reviewButton}
            onPress={() => handleReviewApplicant(item)}
          >
            <Text style={styles.reviewButtonText}>Review Applicant</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };
    return (
    <SafeScreenWrapper>
      <HeaderBox 
        title={job ? `Applications: ${job.job_title}` : 'Applications'} 
        showBackButton 
        onBackPress={() => router.back()}
      />
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0077B6" />
        </View>
      ) : (
        <>          {applications.length > 0 && (
            <>
              <View style={styles.statsContainer}>
                <Text style={styles.statLabel}>
                  <Text style={styles.statNumber}>{applications.length}</Text> total applications
                </Text>
                <View style={styles.statDivider} />
                <Text style={styles.statLabel}>
                  <Text style={styles.statNumber}>
                    {applications.filter(app => app.status === 'shortlisted' || app.status === 'accepted').length}
                  </Text> shortlisted
                </Text>
              </View>
              
              <View style={styles.sortContainer}>
                <Text style={styles.sortLabel}>Sort by:</Text>
                <View style={styles.sortButtons}>
                  <TouchableOpacity 
                    style={[styles.sortButton, sortBy === 'date' && styles.activeSortButton]} 
                    onPress={() => {
                      if (sortBy === 'date') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('date');
                        setSortOrder('desc');
                      }
                    }}
                  >
                    <Text style={[styles.sortButtonText, sortBy === 'date' && styles.activeSortButtonText]}>
                      Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.sortButton, sortBy === 'name' && styles.activeSortButton]} 
                    onPress={() => {
                      if (sortBy === 'name') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('name');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    <Text style={[styles.sortButtonText, sortBy === 'name' && styles.activeSortButtonText]}>
                      Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.sortButton, sortBy === 'status' && styles.activeSortButton]} 
                    onPress={() => {
                      if (sortBy === 'status') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('status');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    <Text style={[styles.sortButtonText, sortBy === 'status' && styles.activeSortButtonText]}>
                      Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
            <FlatList
            data={applications.slice().sort((a, b) => {
              // Sort by date
              if (sortBy === 'date') {
                const dateA = new Date(a.application_date).getTime();
                const dateB = new Date(b.application_date).getTime();
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
              }
              // Sort by applicant name
              else if (sortBy === 'name') {
                const nameA = a.applicant_name?.toUpperCase() || '';
                const nameB = b.applicant_name?.toUpperCase() || '';
                return sortOrder === 'asc' 
                  ? nameA.localeCompare(nameB)
                  : nameB.localeCompare(nameA);
              }
              // Sort by status
              else if (sortBy === 'status') {
                // Define status priority for sorting (custom order)
                const statusPriority = {
                  'accepted': 1,
                  'shortlisted': 2,
                  'viewed': 3,
                  'pending': 4,
                  'rejected': 5
                };
                const priorityA = statusPriority[a.status] || 999;
                const priorityB = statusPriority[b.status] || 999;
                return sortOrder === 'asc' ? priorityA - priorityB : priorityB - priorityA;
              }
              return 0;
            })}
            renderItem={renderApplicationItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#0077B6']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={60} color="#ccc" />
                <Text style={styles.emptyText}>No applications yet</Text>
                <Text style={styles.emptySubtext}>
                  When fishermen apply for this job, they will appear here
                </Text>
              </View>
            }
          />
        </>
      )}
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flexGrow: 1,
    padding: 16,
  },
  applicationCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  applicantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  applicantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  applicantDetails: {
    marginLeft: 12,
    flex: 1,
  },
  applicantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  applicantEmail: {
    fontSize: 14,
    color: '#666',
  },
  messageButton: {
    padding: 8,
  },
  coverLetterContainer: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  coverLetterText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  statusContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statusButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  activeStatusButton: {
    backgroundColor: '#0077B6',
  },
  statusButtonText: {
    fontSize: 12,
    color: '#666',
  },
  activeStatusButtonText: {
    color: 'white',
    fontWeight: '500',
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
  },  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0077B6',
  },
  statDivider: {
    height: 24,
    width: 1,
    backgroundColor: '#ddd',
    marginHorizontal: 16,
  },
  statusBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  applicationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  applicationDate: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },  messageButtonEnhanced: {
    backgroundColor: '#0077B6',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    elevation: 1,
  },
  messageButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',  },
  messageButtonText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  cvButtonEnhanced: {
    backgroundColor: '#FF9800',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    elevation: 1,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sortLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  sortButtons: {
    flexDirection: 'row',
    flex: 1,
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  activeSortButton: {
    backgroundColor: '#0077B6',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#666',
  },  activeSortButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  applicantInfoContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#0077B6',
  },
  infoItem: {
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
  },  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  reviewButtonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  cvButtonDisabled: {
    backgroundColor: '#ccc',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    elevation: 1,
  },
  disabledButtonText: {
    color: '#999',
  },
});

export default JobApplicationsScreen;
