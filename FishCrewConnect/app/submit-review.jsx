import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Alert, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { reviewsAPI } from '../services/api';
import SafeScreenWrapper from '../components/SafeScreenWrapper';
import HeaderBox from '../components/HeaderBox';
import CustomButton from '../components/CustomButton';

const SubmitReviewScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userId, jobId, recipientName, jobTitle } = params;
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    
    try {
      setLoading(true);
        const reviewData = {
        job_id: jobId,
        reviewed_user_id: userId,
        rating,
        comment
      };
      
      await reviewsAPI.createReview(reviewData);
      
      Alert.alert(
        'Review Submitted',
        'Thank you for your feedback!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Failed to submit review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Render stars for rating selection
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity 
          key={i}
          onPress={() => setRating(i)}
          style={styles.starContainer}
        >
          <Ionicons
            name={i <= rating ? "star" : "star-outline"} 
            size={40} 
            color={i <= rating ? "#FFD700" : "#ccc"} 
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };
  
  return (
    <SafeScreenWrapper>
      <HeaderBox title="Submit Review" />
      
      <View style={styles.container}>
        <Text style={styles.subtitle}>
          How was your experience working with {recipientName} on &quot;{jobTitle}&quot;?
        </Text>
        
        <View style={styles.ratingContainer}>
          {renderStars()}
        </View>
        
        <Text style={styles.ratingText}>
          {rating > 0 ? `Your rating: ${rating}/5` : 'Select a rating'}
        </Text>
        
        <Text style={styles.label}>Comment (optional)</Text>
        <TextInput
          style={styles.textArea}
          value={comment}
          onChangeText={setComment}
          placeholder="Share your experience..."
          multiline
          textAlignVertical="top"
        />
        
        <CustomButton
          title={loading ? "Submitting..." : "Submit Review"}
          onPress={handleSubmit}
          disabled={loading || rating === 0}
          style={styles.button}
        />
      </View>
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 24,
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
  },
  starContainer: {
    padding: 6,
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 24,
    color: '#666',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    fontSize: 16,
    marginBottom: 24,
  },
  button: {
    marginTop: 16,
  },
});

export default SubmitReviewScreen;
