import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * JobCard Component - Displays job information in a card format
 * @param {object} job - The job object containing all job details
 * @param {function} onPress - Function to call when the card is pressed
 * @param {boolean} showStatus - Whether to show the job status badge
 */
const JobCard = ({ job, onPress, showStatus = true }) => {
  // Calculate days left until deadline
  const getDeadlineDays = () => {
    const deadline = new Date(job.application_deadline);
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Last day!';
    return `${diffDays} days left`;
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return '#4CAF50'; // Green
      case 'closed': return '#F44336'; // Red
      case 'filled': return '#2196F3'; // Blue
      case 'cancelled': return '#9E9E9E'; // Grey
      default: return '#9E9E9E'; // Grey
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.title}>{job.job_title}</Text>
        {showStatus && (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
            <Text style={styles.statusText}>{job.status}</Text>
          </View>
        )}
      </View>

      <View style={styles.locationContainer}>
        <Ionicons name="location-outline" size={16} color="#666" />
        <Text style={styles.locationText}>{job.location}</Text>
      </View>

      <Text numberOfLines={2} style={styles.description}>
        {job.description}
      </Text>

      <View style={styles.footer}>
        <View style={styles.paymentContainer}>
          <Ionicons name="cash-outline" size={16} color="#666" />
          <Text style={styles.paymentText}>{job.payment_details}</Text>
        </View>

        <View style={styles.deadlineContainer}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.deadlineText}>{getDeadlineDays()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
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
  title: {
    fontSize: 18,
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
  description: {
    color: '#444',
    marginBottom: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  paymentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    marginLeft: 4,
    color: '#666',
    fontSize: 14,
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadlineText: {
    marginLeft: 4,
    color: '#666',
    fontSize: 14,
  },
});

export default JobCard;
