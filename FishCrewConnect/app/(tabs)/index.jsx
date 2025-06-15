import { StyleSheet, View, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Text } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { jobsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import JobCard from '../../components/JobCard';
import CustomButton from '../../components/CustomButton';
import FormInput from '../../components/FormInput';
import SafeScreenWrapper from '../../components/SafeScreenWrapper';
import HeaderBox from '../../components/HeaderBox';

const JobsScreen = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { user } = useAuth();
  const router = useRouter();    const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load different jobs based on user type
      if (user && user.user_type === 'boat_owner') {
        // Boat owners see their own posted jobs
        const jobsData = await jobsAPI.getMyJobs();
        setJobs(jobsData);
      } else {
        // Fishermen (crew) see all available jobs
        const jobsData = await jobsAPI.getAllJobs();
        setJobs(jobsData);
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);
  
  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const onRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  const handleCreateJob = () => {
    router.push('/create-job');
  };

  // Filter jobs based on search query and status filter
  const filteredJobs = jobs.filter(job => {
    // First apply text search filter
    const matchesSearch = searchQuery 
      ? job.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.description && job.description.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    
    // Then apply status filter
    const matchesStatus = filterStatus === 'all' || job.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const renderJobItem = ({ item }) => (
    <JobCard 
      job={item} 
      onPress={() => router.push(`/job-details/${item.job_id}`)}
    />
  );

  const renderFilterButton = (status, label, icon) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterStatus === status && styles.filterButtonActive
      ]}
      onPress={() => setFilterStatus(status)}
    >
      <Ionicons 
        name={icon} 
        size={16} 
        color={filterStatus === status ? '#ffffff' : '#2D3748'} 
      />
      <Text 
        style={[
          styles.filterButtonText,
          filterStatus === status && styles.filterButtonTextActive
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
  return (
    <SafeScreenWrapper>
      <HeaderBox title="Jobs">
        {user && user.user_type === 'boat_owner' && (
          <TouchableOpacity 
            style={styles.createJobButton}
            onPress={() => router.push('/create-job')}
          >
            <Ionicons name="add-circle-outline" size={24} color="#0077B6" />
            <Text style={styles.createJobButtonText}>Post Job</Text>
          </TouchableOpacity>
        )}
      </HeaderBox>
      <View style={styles.searchContainer}>
        <FormInput
          placeholder="Search jobs..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search-outline"
          clearButton
          onClear={() => setSearchQuery('')}
          containerStyle={styles.searchInput}
        />
      </View>

      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All', 'list-outline')}
        {renderFilterButton('open', 'Open', 'checkbox-outline')}
        {renderFilterButton('filled', 'Filled', 'people-outline')}
        {renderFilterButton('closed', 'Closed', 'close-circle-outline')}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0077B6" />
        </View>
      ) : filteredJobs.length > 0 ? (
        <FlatList
          data={filteredJobs}
          renderItem={renderJobItem}
          keyExtractor={(item) => item.job_id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="search" size={64} color="#CBD5E0" />
          <Text style={styles.emptyText}>No jobs found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery || filterStatus !== 'all' 
              ? 'Try changing your search or filters'
              : 'Be the first to post a job!'}
          </Text>
          {user?.user_type === 'boat_owner' && (
            <CustomButton
              title="Post a Job"
              onPress={handleCreateJob}
              style={styles.emptyButton}
            />
          )}
        </View>
      )}

      {user?.user_type === 'boat_owner' && (
        <TouchableOpacity 
          style={styles.fabButton}
          onPress={handleCreateJob}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    marginVertical: 0,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#EDF2F7',
  },
  filterButtonActive: {
    backgroundColor: '#0077B6',
  },
  filterButtonText: {
    fontSize: 14,
    marginLeft: 4,
    color: '#2D3748',
  },  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  createJobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F7FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  createJobButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0077B6',
    marginLeft: 4,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#2D3748',
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    color: '#718096',
  },
  emptyButton: {
    width: '70%',
  },
  fabButton: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0077B6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default JobsScreen;
