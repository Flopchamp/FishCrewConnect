import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { jobsAPI } from '../../services/api';
import SafeScreenWrapper from '../../components/SafeScreenWrapper';
import HeaderBox from '../../components/HeaderBox';
import CustomButton from '../../components/CustomButton';
import FormInput from '../../components/FormInput';

const EditJobScreen = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const jobId = id;

  // Form state
  const [formData, setFormData] = useState({
    job_title: '',
    description: '',
    requirements: '',
    location: '',
    payment_details: '',
    job_duration: '',
    application_deadline: '',
    status: 'open'
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  // Load existing job data
  useEffect(() => {
    const loadJobData = async () => {
      try {
        setLoading(true);
        
        // For testing purposes, let's add some mock data if API fails
        try {
          const jobData = await jobsAPI.getJobById(jobId);
          
          // Check if user is the owner of this job
          if (!user || user.id !== jobData.user_id) {
            Alert.alert(
              'Access Denied',
              'You can only edit your own job postings.',
              [{ text: 'OK', onPress: () => router.back() }]
            );
            return;
          }

          // Populate form with existing data
          setFormData({
            job_title: jobData.job_title || '',
            description: jobData.description || '',
            requirements: jobData.requirements || '',
            location: jobData.location || '',
            payment_details: jobData.payment_details || '',
            job_duration: jobData.job_duration || '',
            application_deadline: jobData.application_deadline ? 
              new Date(jobData.application_deadline).toISOString().split('T')[0] : '',
            status: jobData.status || 'open'
          });        } catch (apiError) {
          console.error('API Error loading job data:', apiError);
          Alert.alert(
            'Error',
            'Failed to load job data. Please check your connection and try again.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
          return;
        }
      } catch (error) {
        console.error('Error loading job data:', error);
        Alert.alert('Error', 'Failed to load job data');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      loadJobData();
    }
  }, [jobId, user, router]);

  // Update form field
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.job_title || !formData.job_title.trim()) {
      newErrors.job_title = 'Job title is required';
    }

    if (!formData.description || !formData.description.trim()) {
      newErrors.description = 'Job description is required';
    }

    if (!formData.location || !formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.payment_details || !formData.payment_details.trim()) {
      newErrors.payment_details = 'Payment details are required';
    }

    if (formData.application_deadline) {
      const deadline = new Date(formData.application_deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (deadline < today) {
        newErrors.application_deadline = 'Application deadline cannot be in the past';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  // Handle form submission
  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors and try again');
      return;
    }

    try {
      setSaving(true);
      
      // Prepare data for API
      const updateData = {
        ...formData,
        application_deadline: formData.application_deadline || null,
      };      try {
        await jobsAPI.updateJob(jobId, updateData);
        
        Alert.alert(
          'Success',
          'Job updated successfully!',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } catch (apiError) {
        console.error('API Error during save:', apiError);
        Alert.alert('Error', 'Failed to update job. Please try again.');
      }
    } catch (error) {
      console.error('Error updating job:', error);
      Alert.alert('Error', 'Failed to update job. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle job deletion
  const handleDelete = () => {
    Alert.alert(
      'Delete Job',
      'Are you sure you want to delete this job? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await jobsAPI.deleteJob(jobId);
              Alert.alert(
                'Success',
                'Job deleted successfully',
                [{ text: 'OK', onPress: () => router.replace('/(tabs)/') }]
              );
            } catch (error) {
              console.error('Error deleting job:', error);
              Alert.alert('Error', 'Failed to delete job. Please try again.');
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeScreenWrapper>
        <HeaderBox title="Edit Job" showBackButton={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#44DBE9" />
        </View>
      </SafeScreenWrapper>
    );
  }

  return (
    <SafeScreenWrapper>
      <HeaderBox title="Edit Job" showBackButton={true} />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <FormInput
            label="Job Title"
            value={formData.job_title}
            onChangeText={(value) => updateField('job_title', value)}
            placeholder="Enter job title"
            error={errors.job_title}
            required
          />

          <FormInput
            label="Description"
            value={formData.description}
            onChangeText={(value) => updateField('description', value)}
            placeholder="Describe the job details..."
            multiline
            numberOfLines={4}
            error={errors.description}
            required
          />

          <FormInput
            label="Requirements"
            value={formData.requirements}
            onChangeText={(value) => updateField('requirements', value)}
            placeholder="List any specific requirements..."
            multiline
            numberOfLines={3}
            error={errors.requirements}
          />

          <FormInput
            label="Location"
            value={formData.location}
            onChangeText={(value) => updateField('location', value)}
            placeholder="Job location"
            error={errors.location}
            required
          />

          <FormInput
            label="Payment Details"
            value={formData.payment_details}
            onChangeText={(value) => updateField('payment_details', value)}
            placeholder="e.g., $200/day, $50/hour"
            error={errors.payment_details}
            required
          />

          <FormInput
            label="Duration"
            value={formData.job_duration}
            onChangeText={(value) => updateField('job_duration', value)}
            placeholder="e.g., 1 day, 2 weeks"
            error={errors.job_duration}
          />

          <FormInput
            label="Application Deadline (Optional)"
            value={formData.application_deadline}
            onChangeText={(value) => updateField('application_deadline', value)}
            placeholder="YYYY-MM-DD"
            error={errors.application_deadline}
          />

          {/* Job Status */}
          <View style={styles.statusSection}>
            <Text style={styles.statusLabel}>Job Status</Text>
            <View style={styles.statusOptions}>
              {[
                { value: 'open', label: 'Open', color: '#4CAF50' },
                { value: 'filled', label: 'Filled', color: '#2196F3' },
                { value: 'in_progress', label: 'In Progress', color: '#FF9800' },
                { value: 'completed', label: 'Completed', color: '#9C27B0' },
                { value: 'cancelled', label: 'Cancelled', color: '#F44336' }
              ].map((status) => (
                <TouchableOpacity
                  key={status.value}
                  style={[
                    styles.statusOption,
                    formData.status === status.value && {
                      backgroundColor: status.color,
                      borderColor: status.color
                    }
                  ]}
                  onPress={() => updateField('status', status.value)}
                >
                  <Text style={[
                    styles.statusOptionText,
                    formData.status === status.value && styles.statusOptionTextActive
                  ]}>
                    {status.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>          {/* Action Buttons */}
          <View style={styles.buttonSection}>
            <CustomButton
              title="Save Changes"
              onPress={handleSave}
              isLoading={saving}
              icon="save-outline"
              fullWidth
              style={styles.saveButton}
            />

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={saving}
            >
              <Ionicons name="trash-outline" size={20} color="#e53935" />
              <Text style={styles.deleteButtonText}>Delete Job</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    padding: 16,
  },
  statusSection: {
    marginBottom: 24,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  statusOptionText: {
    fontSize: 14,
    color: '#666',
  },
  statusOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonSection: {
    marginTop: 32,
    gap: 16,
  },  saveButton: {
    backgroundColor: '#44DBE9',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffebee',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  deleteButtonText: {
    color: '#e53935',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default EditJobScreen;
