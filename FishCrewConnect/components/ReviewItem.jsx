import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DefaultProfileImage from './DefaultProfileImage';

/**
 * ReviewItem Component - Display individual reviews
 * @param {object} review - The review data
 */
const ReviewItem = ({ review }) => {
  // Format the review date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Render star rating
  const renderRating = (rating) => {
    const stars = [];
    const maxRating = 5;
    
    for (let i = 1; i <= maxRating; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color={i <= rating ? '#FFC107' : '#D1D1D1'}
          style={styles.star}
        />
      );
    }
    
    return <View style={styles.ratingContainer}>{stars}</View>;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>        {review.reviewer_image ? (
          <Image 
            source={{ uri: review.reviewer_image }} 
            style={styles.reviewerImage} 
          />
        ) : (
          <View style={styles.reviewerImageContainer}>
            <DefaultProfileImage size={40} />
          </View>
        )}
        
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
          <Text style={styles.jobTitle}>{review.job_title}</Text>
        </View>
        
        <Text style={styles.date}>{formatDate(review.created_at)}</Text>
      </View>
      
      {renderRating(review.rating)}
      
      <Text style={styles.comment}>{review.comment}</Text>
      
      {review.response && (
        <View style={styles.responseContainer}>
          <Text style={styles.responseHeader}>Response:</Text>
          <Text style={styles.responseText}>{review.response}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },  reviewerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E1E1E1', // Placeholder color
  },
  reviewerImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  reviewerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  jobTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  star: {
    marginRight: 4,
  },
  comment: {
    fontSize: 14,
    lineHeight: 20,
    color: '#444',
  },
  responseContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  responseHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#666',
    lineHeight: 18,
  },
});

export default ReviewItem;
