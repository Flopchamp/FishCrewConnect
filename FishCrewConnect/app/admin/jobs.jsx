import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Alert, ActivityIndicator, TextInput, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SafeScreenWrapper from '../../components/SafeScreenWrapper';
import HeaderBox from '../../components/HeaderBox';
import { adminAPI } from '../../services/api';

const JobManagement = () => {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetailModal, setJobDetailModal] = useState(false);
  const jobStatuses = [
    { label: 'All Jobs', value: 'all' },
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Filled', value: 'filled' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' }
  ];
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage.toString(),
        limit: '20',
        status: selectedStatus,
        search: searchQuery
      };

      const response = await adminAPI.getAllJobs(params);
      setJobs(response.jobs);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      Alert.alert('Error', 'Failed to fetch jobs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, selectedStatus, searchQuery]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchJobs();
  };

  const handleJobPress = (job) => {
    setSelectedJob(job);
    setJobDetailModal(true);
  };
  const handleJobStatusUpdate = (status, jobId, jobTitle) => {
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    
    Alert.alert(
      `${statusText} Job`,
      `Are you sure you want to mark "${jobTitle}" as ${status}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: statusText,
          style: status === 'cancelled' ? 'destructive' : 'default',
          onPress: () => performJobStatusUpdate(status, jobId)
        }
      ]
    );
  };
  const performJobStatusUpdate = async (status, jobId) => {
    try {
      await adminAPI.updateJobStatus(jobId, status, `Status updated to ${status} by admin`);
      
      Alert.alert('Success', `Job status updated to ${status} successfully`);
      fetchJobs(); // Refresh the list
      setJobDetailModal(false);
    } catch (error) {
      console.error(`Error updating job status:`, error);
      Alert.alert('Error', `Failed to update job status`);
    }
  };
  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return '#4CAF50';
      case 'in_progress':
        return '#2196F3';
      case 'filled':
        return '#FF9800';
      case 'completed':
        return '#9C27B0';
      case 'cancelled':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderJobItem = ({ item }) => (
    <TouchableOpacity style={styles.jobCard} onPress={() => handleJobPress(item)}>
      <View style={styles.jobInfo}>
        <View style={styles.jobHeader}>
          <Text style={styles.jobTitle} numberOfLines={1}>{item.job_title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusBadgeText}>{item.status}</Text>
          </View>
        </View>
        
        <Text style={styles.jobDescription} numberOfLines={2}>{item.description}</Text>
        
        <View style={styles.jobMeta}>
          <Text style={styles.jobMetaText}>
            <Ionicons name="person" size={14} color="#666" /> {item.posted_by}
          </Text>
          <Text style={styles.jobMetaText}>
            <Ionicons name="location" size={14} color="#666" /> {item.location}
          </Text>
        </View>
          <View style={styles.jobFooter}>
          <Text style={styles.jobPayRate}>{item.payment_details || 'Payment TBD'}</Text>
          <Text style={styles.jobApplications}>
            {item.application_count} application{item.application_count !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.jobDate}>
            Posted: {formatDate(item.created_at)}
          </Text>
        </View>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderFilterChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
      {jobStatuses.map((status) => (
        <TouchableOpacity
          key={status.value}
          style={[
            styles.filterChip,
            selectedStatus === status.value && styles.filterChipActive
          ]}
          onPress={() => {
            setSelectedStatus(status.value);
            setCurrentPage(1);
          }}
        >
          <Text style={[
            styles.filterChipText,
            selectedStatus === status.value && styles.filterChipTextActive
          ]}>
            {status.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderPagination = () => (
    <View style={styles.paginationContainer}>
      <TouchableOpacity
        style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
        onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
        disabled={currentPage === 1}
      >
        <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? '#ccc' : '#007AFF'} />
      </TouchableOpacity>
      
      <Text style={styles.paginationText}>
        Page {currentPage} of {totalPages}
      </Text>
      
      <TouchableOpacity
        style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
        onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
        disabled={currentPage === totalPages}
      >
        <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? '#ccc' : '#007AFF'} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeScreenWrapper>
      <HeaderBox 
        title="Job Management" 
        leftComponent={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        }
      />
      
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs by title, description, or poster..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>

        {/* Filter Chips */}
        {renderFilterChips()}

        {/* Jobs List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading jobs...</Text>
          </View>
        ) : (
          <>
            <FlatList
              data={jobs}
              renderItem={renderJobItem}
              keyExtractor={(item) => item.job_id.toString()}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
            
            {/* Pagination */}
            {totalPages > 1 && renderPagination()}
          </>
        )}
      </View>

      {/* Job Detail Modal */}
      <Modal
        visible={jobDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeScreenWrapper>          <HeaderBox
            title="Job Details"
            leftComponent={
              <TouchableOpacity onPress={() => setJobDetailModal(false)}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
            }
            rightComponent={
              <TouchableOpacity onPress={() => {
                setJobDetailModal(false);
                router.push('/admin');
              }}>
                <View style={styles.dashboardButton}>
                  <Ionicons name="grid" size={20} color="#fff" />
                  <Text style={styles.dashboardButtonText}>Dashboard</Text>
                </View>
              </TouchableOpacity>
            }
          />
          
          {selectedJob && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.jobDetailCard}>
                <View style={styles.jobDetailHeader}>
                  <Text style={styles.jobDetailTitle}>{selectedJob.job_title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedJob.status) }]}>
                    <Text style={styles.statusBadgeText}>{selectedJob.status}</Text>
                  </View>
                </View>
                
                <Text style={styles.jobDetailDescription}>{selectedJob.description}</Text>
                
                <View style={styles.jobDetailInfo}>
                  <View style={styles.jobDetailRow}>
                    <Text style={styles.jobDetailLabel}>Posted by:</Text>
                    <Text style={styles.jobDetailValue}>{selectedJob.posted_by}</Text>
                  </View>
                  
                  <View style={styles.jobDetailRow}>
                    <Text style={styles.jobDetailLabel}>Location:</Text>
                    <Text style={styles.jobDetailValue}>{selectedJob.location}</Text>
                  </View>
                    <View style={styles.jobDetailRow}>
                    <Text style={styles.jobDetailLabel}>Payment:</Text>
                    <Text style={styles.jobDetailValue}>{selectedJob.payment_details || 'Payment details TBD'}</Text>
                  </View>
                  
                  <View style={styles.jobDetailRow}>
                    <Text style={styles.jobDetailLabel}>Duration:</Text>
                    <Text style={styles.jobDetailValue}>{selectedJob.job_duration || 'Not specified'}</Text>
                  </View>
                  
                  <View style={styles.jobDetailRow}>
                    <Text style={styles.jobDetailLabel}>Application Deadline:</Text>
                    <Text style={styles.jobDetailValue}>
                      {selectedJob.application_deadline ? formatDate(selectedJob.application_deadline) : 'Not specified'}
                    </Text>
                  </View>
                  
                  <View style={styles.jobDetailRow}>
                    <Text style={styles.jobDetailLabel}>Applications:</Text>
                    <Text style={styles.jobDetailValue}>{selectedJob.application_count}</Text>
                  </View>
                  
                  <View style={styles.jobDetailRow}>
                    <Text style={styles.jobDetailLabel}>Posted:</Text>
                    <Text style={styles.jobDetailValue}>{formatDate(selectedJob.created_at)}</Text>
                  </View>
                </View>
              </View>              {/* Action Buttons */}
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.openButton]}
                  onPress={() => handleJobStatusUpdate('open', selectedJob.job_id, selectedJob.job_title)}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Mark Open</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.inProgressButton]}
                  onPress={() => handleJobStatusUpdate('in_progress', selectedJob.job_id, selectedJob.job_title)}
                >
                  <Ionicons name="play-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Mark In Progress</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.filledButton]}
                  onPress={() => handleJobStatusUpdate('filled', selectedJob.job_id, selectedJob.job_title)}
                >
                  <Ionicons name="people" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Mark Filled</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.completeButton]}
                  onPress={() => handleJobStatusUpdate('completed', selectedJob.job_id, selectedJob.job_title)}
                >
                  <Ionicons name="checkmark-done" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Mark Completed</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => handleJobStatusUpdate('cancelled', selectedJob.job_id, selectedJob.job_title)}
                >
                  <Ionicons name="ban" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Cancel Job</Text>                </TouchableOpacity>
              </View>

              {/* Back to Dashboard Button */}
              <View style={styles.dashboardActionContainer}>
                <TouchableOpacity
                  style={styles.dashboardActionButton}
                  onPress={() => {
                    setJobDetailModal(false);
                    router.push('/admin');
                  }}
                >
                  <Ionicons name="grid" size={20} color="#007AFF" />
                  <Text style={styles.dashboardActionText}>Back to Dashboard</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeScreenWrapper>
      </Modal>
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  jobCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  jobInfo: {
    flex: 1,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  jobDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  jobMeta: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 16,
  },
  jobMetaText: {
    fontSize: 14,
    color: '#666',
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  jobPayRate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  jobApplications: {
    fontSize: 12,
    color: '#666',
  },
  jobDate: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  paginationButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationText: {
    marginHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  jobDetailCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobDetailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  jobDetailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  jobDetailDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  jobDetailInfo: {
    gap: 12,
  },
  jobDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  jobDetailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    flex: 1,
  },
  jobDetailValue: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  actionButtonsContainer: {
    margin: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },  activeButton: {
    backgroundColor: '#4CAF50',
  },
  inactiveButton: {
    backgroundColor: '#FF9800',
  },
  suspendButton: {
    backgroundColor: '#F44336',
  },
  completeButton: {
    backgroundColor: '#2196F3',
  },
  openButton: {
    backgroundColor: '#4CAF50',
  },
  inProgressButton: {
    backgroundColor: '#2196F3',
  },
  filledButton: {
    backgroundColor: '#FF9800',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dashboardButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dashboardActionContainer: {
    margin: 16,
    marginTop: 8,
  },
  dashboardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 8,
  },
  dashboardActionText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default JobManagement;
