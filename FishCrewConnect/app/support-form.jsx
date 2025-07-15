import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import SafeScreenWrapper from '../components/SafeScreenWrapper';
import HeaderBox from '../components/HeaderBox';
import apiService from '../services/api';

const SupportForm = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    subject: '',
    description: '',
    priority: 'normal'
  });

  const categories = [
    { id: 'technical', label: 'Technical Issues', icon: 'bug-outline' },
    { id: 'payment', label: 'Payment Problems', icon: 'card-outline' },
    { id: 'account', label: 'Account Issues', icon: 'person-outline' },
    { id: 'jobs', label: 'Job Related', icon: 'briefcase-outline' },
    { id: 'messaging', label: 'Messaging Issues', icon: 'chatbubble-outline' },
    { id: 'other', label: 'Other', icon: 'help-outline' }
  ];

  const priorities = [
    { id: 'low', label: 'Low Priority', color: '#10b981' },
    { id: 'normal', label: 'Normal Priority', color: '#f59e0b' },
    { id: 'high', label: 'High Priority', color: '#ef4444' },
    { id: 'urgent', label: 'Urgent', color: '#dc2626' }
  ];

  const handleSubmit = async () => {
    // Validate form
    if (!formData.category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (!formData.subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please describe your issue');
      return;
    }

    setLoading(true);
    try {
      // Submit support ticket
      const ticketData = {
        category: formData.category,
        subject: formData.subject.trim(),
        description: formData.description.trim(),
        priority: formData.priority
      };

      const result = await apiService.support.submitTicket(ticketData);

      Alert.alert(
        'Support Ticket Submitted',
        `Thank you for contacting us. Your ticket #${result.ticketId} has been created and we will respond within 24 hours.`,
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );

      // Reset form
      setFormData({
        category: '',
        subject: '',
        description: '',
        priority: 'normal'
      });

    } catch (error) {
      console.error('Error submitting support ticket:', error);
      Alert.alert('Error', 'Failed to submit support ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeScreenWrapper>
      <HeaderBox
        title="Contact Support"
        showBackButton={true}
        onBackPress={() => router.back()}
      />
      
      <ScrollView style={styles.container}>
        {/* User Information */}
        <View style={styles.userInfoCard}>
          <Text style={styles.userInfoTitle}>Your Information</Text>
          <Text style={styles.userInfoText}>Name: {user?.name}</Text>
          <Text style={styles.userInfoText}>Email: {user?.email}</Text>
          <Text style={styles.userInfoText}>User Type: {user?.user_type?.replace('_', ' ')}</Text>
        </View>

        {/* Category Selection */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Category *</Text>
          <View style={styles.categoryGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  formData.category === category.id && styles.categoryButtonSelected
                ]}
                onPress={() => setFormData({ ...formData, category: category.id })}
              >
                <Ionicons 
                  name={category.icon} 
                  size={24} 
                  color={formData.category === category.id ? '#ffffff' : '#6b7280'} 
                />
                <Text style={[
                  styles.categoryButtonText,
                  formData.category === category.id && styles.categoryButtonTextSelected
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Priority Selection */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Priority</Text>
          <View style={styles.priorityContainer}>
            {priorities.map((priority) => (
              <TouchableOpacity
                key={priority.id}
                style={[
                  styles.priorityButton,
                  formData.priority === priority.id && { 
                    backgroundColor: priority.color + '20',
                    borderColor: priority.color 
                  }
                ]}
                onPress={() => setFormData({ ...formData, priority: priority.id })}
              >
                <View style={[styles.priorityDot, { backgroundColor: priority.color }]} />
                <Text style={[
                  styles.priorityButtonText,
                  formData.priority === priority.id && { color: priority.color }
                ]}>
                  {priority.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Subject Input */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Subject *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Brief description of your issue"
            value={formData.subject}
            onChangeText={(text) => setFormData({ ...formData, subject: text })}
            maxLength={100}
            placeholderTextColor="#9ca3af"
          />
          <Text style={styles.characterCount}>{formData.subject.length}/100</Text>
        </View>

        {/* Description Input */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Description *</Text>
          <TextInput
            style={[styles.textInput, styles.textAreaInput]}
            placeholder="Please provide detailed information about your issue, including any error messages and steps to reproduce the problem."
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline={true}
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
            placeholderTextColor="#9ca3af"
          />
          <Text style={styles.characterCount}>{formData.description.length}/1000</Text>
        </View>

       

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Ionicons name="send-outline" size={20} color="#ffffff" />
              <Text style={styles.submitButtonText}>Submit Support Request</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Alternative Contact Methods */}
        <View style={styles.alternativeContactCard}>
          <Text style={styles.alternativeTitle}>Other ways to reach us:</Text>
          <View style={styles.contactMethodsContainer}>
            <View style={styles.contactMethod}>
              <Ionicons name="mail-outline" size={20} color="#6b7280" />
              <Text style={styles.contactMethodText}>support@fishcrewconnect.com</Text>
            </View>
            <View style={styles.contactMethod}>
              <Ionicons name="time-outline" size={20} color="#6b7280" />
              <Text style={styles.contactMethodText}>Response time: Within 24 hours</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  userInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  userInfoText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '47%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryButtonSelected: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  categoryButtonText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },
  categoryButtonTextSelected: {
    color: '#ffffff',
  },
  priorityContainer: {
    gap: 8,
  },
  priorityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textAreaInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
  },
  tipsCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0c4a6e',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    color: '#0c4a6e',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#1e40af',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  alternativeContactCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  alternativeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  contactMethodsContainer: {
    gap: 8,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactMethodText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
});

export default SupportForm;
