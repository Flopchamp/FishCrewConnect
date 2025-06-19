import { StyleSheet, Text, View, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { applicationsAPI, jobsAPI } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import SafeScreenWrapper from '../../components/SafeScreenWrapper';
import HeaderBox from '../../components/HeaderBox';
import { useSocketIO } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
import ApplicationItem from '../../components/ApplicationItem';

const MyApplicationsScreen = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { socket, isConnected } = useSocketIO();
  
  // Check if the current user is a boat owner
  const isBoatOwner = user?.user_type === 'boat_owner';
  // Load application data
  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      
      let newApps = [];
      
      if (isBoatOwner) {
        // For boat owners: Get all jobs they posted
        const jobs = await jobsAPI.getMyJobs();
        
        // Then get all applications for those jobs
        if (jobs && jobs.length > 0) {
          // Create promises for all job application requests
          const promises = jobs.map(job => 
            applicationsAPI.getJobApplications(job.job_id)
              .then(apps => apps.map(app => ({
                ...app,
                job_title: job.job_title || 'Unknown Job',
                location: job.location || 'Unknown Location'
              })))
              .catch(() => [])
          );
          
          // Wait for all promises to complete
          const results = await Promise.all(promises);
          
          // Flatten the results
          newApps = results.flat();
        }
      } else {
        // For fishermen: Get applications they've submitted
        newApps = await applicationsAPI.getMyApplications();
      }
        // Log the loaded applications for debugging
      console.log(`Loaded ${newApps.length} applications for ${isBoatOwner ? 'boat owner' : 'fisherman'}`);
      
      if (newApps.length > 0) {
        console.log('First application:', newApps[0]);
      }
      
      // Update state with fetched applications
      setApplications(newApps);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isBoatOwner]); // Removed applications from the dependency array to avoid infinite loops
  // Setup socket listeners for real-time application updates
  useEffect(() => {
    // Only setup listeners if socket is connected
    if (socket && isConnected) {      const handleNotification = (notification) => {
        console.log('Received notification:', notification);
        console.log('User type:', isBoatOwner ? 'Boat Owner' : 'Fisherman');
        
        // Handle notifications based on user type and notification type
        if (isBoatOwner) {
          // BOAT OWNER NOTIFICATIONS
          if (notification.type === 'new_application') {
            // Notification for boat owners when they receive new applications
            console.log('Boat owner received new application notification');
            
            Alert.alert(
              'New Application Received', 
              notification.message || 'You have received a new job application.'
            );
            
            // Refresh the applications list
            loadApplications();
          }
        } else {
          // FISHERMAN NOTIFICATIONS
          if (notification.type === 'application_status_update') {
            // Notification for fishermen when their application status changes
            console.log('Fisherman received application status update');
            
            console.log('Application ID:', notification.application_id);
            
            // Show an alert with the status update
            const statusMatch = notification.message.match(/updated to ([a-z]+)/i);
            const status = statusMatch ? statusMatch[1].toLowerCase() : null;
            
            if (status) {
              let title = 'Application Updated';
              let message = notification.message;
              
              if (status === 'accepted') {
                title = '🎉 Application Accepted!';
              } else if (status === 'rejected') {
                title = 'Application Rejected';
              } else if (status === 'shortlisted') {
                title = '👍 Application Shortlisted!';
              } else if (status === 'viewed') {
                title = 'Application Viewed';
              }
              
              Alert.alert(title, message);
            }
            
            // Refresh applications after showing the alert
            loadApplications();
          }
        }
      };
      
      // Listen for notifications related to application status updates
      socket.on('new_notification', handleNotification);
      
      return () => {
        socket.off('new_notification', handleNotification);
      };
    }
  }, [socket, isConnected, loadApplications, isBoatOwner]); // Dependencies remain the same but loadApplications no longer depends on applications

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadApplications();
  };
  // No unused functions here
  
  return (
    <SafeScreenWrapper>
      <HeaderBox title={isBoatOwner ? "Received Applications" : "My Applications"} />
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#44DBE9" />
        </View>
      ) : (        <FlatList
          data={applications}
          keyExtractor={(item) => item.id ? item.id.toString() : Math.random().toString()}
          renderItem={({ item }) => (
            <ApplicationItem 
              application={item} 
              isOwner={isBoatOwner}
            />
          )}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#44DBE9']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#ccc" />              
              <Text style={styles.emptyText}>
                {isBoatOwner 
                  ? "You haven't received any applications yet" 
                  : "You haven't applied to any jobs yet"
                }
              </Text>
            </View>
          }
        />
      )}
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 4,
  },
  applicationCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  updatedIcon: {
    marginLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  coverLetterContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  coverLetterLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  coverLetter: {
    fontSize: 14,
    color: '#444',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default MyApplicationsScreen;
