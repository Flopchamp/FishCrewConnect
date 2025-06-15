import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';
import { jobsAPI, authAPI } from '../services/api';

// Simple test component to test API connectivity
export default function ApiTest() {
  const [apiStatus, setApiStatus] = useState('Not tested');
  const [jobs, setJobs] = useState([]);
  const [authStatus, setAuthStatus] = useState('Not tested');
  const [testUser, setTestUser] = useState(null);

  const testJobsApi = async () => {
    try {
      setApiStatus('Testing...');
      const jobsData = await jobsAPI.getAllJobs();
      setJobs(jobsData);
      setApiStatus('SUCCESS: Connected to backend API!');
    } catch (error) {
      setApiStatus(`ERROR: ${JSON.stringify(error)}`);
    }
  };

  const testAuthApi = async () => {
    try {
      setAuthStatus('Testing...');
      // Create a random email to avoid conflicts
      const randomEmail = `test${Math.floor(Math.random() * 10000)}@example.com`;
      
      // Try to sign up
      const signupData = {
        name: 'API Test User',
        email: randomEmail,
        password: 'password123',
        user_type: 'fisherman'
      };
      
      const signupResult = await authAPI.signUp(signupData);
      
      // Try to sign in
      const signinResult = await authAPI.signIn(randomEmail, 'password123');
      
      setTestUser(signinResult.user);
      setAuthStatus('SUCCESS: Authentication working!');
    } catch (error) {
      setAuthStatus(`ERROR: ${JSON.stringify(error)}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>API Connection Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Jobs API Test:</Text>
        <Text style={styles.status}>{apiStatus}</Text>
        <Button title="Test Jobs API" onPress={testJobsApi} />
        
        {jobs.length > 0 && (
          <View style={styles.results}>
            <Text style={styles.resultTitle}>Found {jobs.length} jobs:</Text>
            {jobs.map(job => (
              <View key={job.job_id} style={styles.jobItem}>
                <Text style={styles.jobTitle}>{job.job_title}</Text>
                <Text>{job.location}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Auth API Test:</Text>
        <Text style={styles.status}>{authStatus}</Text>
        <Button title="Test Auth API" onPress={testAuthApi} />
        
        {testUser && (
          <View style={styles.results}>
            <Text style={styles.resultTitle}>User authenticated:</Text>
            <Text>ID: {testUser.id}</Text>
            <Text>Name: {testUser.name}</Text>
            <Text>Email: {testUser.email}</Text>
            <Text>Type: {testUser.user_type}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    marginVertical: 10,
    fontWeight: '500',
  },
  results: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#e0f7fa',
    borderRadius: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  jobItem: {
    marginVertical: 5,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  jobTitle: {
    fontWeight: 'bold',
  },
});
