import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

/**
 * ApplicationItem Component - Display individual job applications
 * @param {object} application - The application data
 * @param {boolean} isOwner - Whether the current user is the job owner
 */
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
  };  // Handle view application details
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
      
      {application.cover_letter && (
        <Text numberOfLines={2} style={styles.coverLetter}>
          &quot;{application.cover_letter}&quot;
        </Text>
      )}
      
      <View style={styles.footer}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.dateText}>Applied on {formatDate(application.application_date)}</Text>
        </View>
          {isOwner && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.viewButton]}
              onPress={handleViewDetails}
            >
              <Text style={styles.viewButtonText}>View Details</Text>
            </TouchableOpacity>            <TouchableOpacity 
              style={[styles.actionButton, styles.messageButton]}
              onPress={handleMessageApplicant}
            >
              <Ionicons name="chatbubble-outline" size={16} color="#0077B6" />
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
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
  coverLetter: {
    color: '#444',
    marginBottom: 12,
    fontStyle: 'italic',
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
  },
});

export default ApplicationItem;
