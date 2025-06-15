import React, { useState } from 'react';
import { StyleSheet, Text, View, Alert, ScrollView } from 'react-native';
import { jobsAPI } from '../services/api';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import SafeScreenWrapper from '../components/SafeScreenWrapper';
import HeaderBox from '../components/HeaderBox';
import FormInput from '../components/FormInput';
import CustomButton from '../components/CustomButton';

const CreateJobScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [jobData, setJobData] = useState({
    job_title: '',
    description: '',
    location: '',
    payment_details: '',
    application_deadline: '',
    job_duration: '',
    requirements: ''
  });
  
  // Update form fields
  const handleInputChange = (field, value) => {
    setJobData({ ...jobData, [field]: value });
  };
  
  // Submit the form
  const handleSubmit = async () => {
    // Check if user is a boat owner
    if (user?.user_type !== 'boat_owner') {
      Alert.alert('Error', 'Only boat owners can post jobs');
      return;
    }
    
    // Validate form
    if (!jobData.job_title || !jobData.description || !jobData.location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Submit job posting
      await jobsAPI.createJob({
        ...jobData,
        status: 'open'
      });
      
      Alert.alert(
        'Success!',
        'Your job has been posted successfully',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );    } catch (error) {
      console.error('Error creating job:', error);
      const errorMessage = error.message || 'Failed to create job posting';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <SafeScreenWrapper>
      <HeaderBox title="Post a Job" showBackButton={true} />
      
      <ScrollView style={styles.container}>
        <Text style={styles.instructions}>
          Fill in the details below to post a new job for fishermen.
        </Text>
        
        <FormInput
          label="Job Title *"
          value={jobData.job_title}
          onChangeText={(text) => handleInputChange('job_title', text)}
          placeholder="e.g., Deep Sea Fishing Crew"
          leftIcon="briefcase-outline"
        />
        
        <FormInput
          label="Location *"
          value={jobData.location}
          onChangeText={(text) => handleInputChange('location', text)}
          placeholder="e.g., Miami Harbor, Florida"
          leftIcon="location-outline"
        />
        
        <FormInput
          label="Payment Details"
          value={jobData.payment_details}
          onChangeText={(text) => handleInputChange('payment_details', text)}
          placeholder="e.g., $200 per day plus share of catch"
          leftIcon="cash-outline"
        />
        
        <FormInput
          label="Job Duration"
          value={jobData.job_duration}
          onChangeText={(text) => handleInputChange('job_duration', text)}
          placeholder="e.g., 3 days, 1 week, seasonal"
          leftIcon="calendar-outline"
        />
        
        <FormInput
          label="Application Deadline"
          value={jobData.application_deadline}
          onChangeText={(text) => handleInputChange('application_deadline', text)}
          placeholder="YYYY-MM-DD"
          leftIcon="time-outline"
        />
        
        <FormInput
          label="Description *"
          value={jobData.description}
          onChangeText={(text) => handleInputChange('description', text)}
          placeholder="Enter detailed job description"
          multiline={true}
          leftIcon="document-text-outline"
          inputProps={{ 
            textAlignVertical: 'top',
            numberOfLines: 5,
            minHeight: 100
          }}
        />
        
        <FormInput
          label="Requirements"
          value={jobData.requirements}
          onChangeText={(text) => handleInputChange('requirements', text)}
          placeholder="Enter skills and experience required"
          multiline={true}
          leftIcon="list-outline"
          inputProps={{ 
            textAlignVertical: 'top',
            numberOfLines: 3,
            minHeight: 80
          }}
        />
        
        <View style={styles.buttonContainer}>
          <CustomButton
            title="Post Job"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            fullWidth
            icon="paper-plane"
          />
        </View>
      </ScrollView>
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  instructions: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 20,
  },
  buttonContainer: {
    marginTop: 16,
    marginBottom: 40,
  }
});

export default CreateJobScreen;
