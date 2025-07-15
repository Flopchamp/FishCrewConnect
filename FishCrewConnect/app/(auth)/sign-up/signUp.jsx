import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';

const SignUp = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);  // Determine if the sign up is specifically for an admin
  const isAdminSignUp = params.userRole === 'admin';

  useEffect(() => {
    if (params.userRole && typeof params.userRole === 'string') {
      setRole(params.userRole);
    }
  }, [params.userRole]);

  const handleSignUp = async () => {
    // Basic validation
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    
    // Validate password strength
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', "Passwords don't match!");
      return;
    }
    
    if (!role) {
      Alert.alert('Error', "Please select a role");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const userData = {
        name: fullName,
        email,
        password,
        user_type: role,
      };

      const result = await signUp(userData);
      
      // Show different messages based on verification status
      if (result.verification_status === 'pending') {
        Alert.alert(
          'Account Created! 🎉', 
          'Your account has been created successfully. Please wait for admin verification before you can access the app.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/sign-in/sign-in') }]
        );
      } else {
        Alert.alert(
          'Success! 🎉', 
          'Account created and verified successfully!', 
          [{ text: 'OK', onPress: () => router.replace('/(auth)/sign-in/sign-in') }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Registration Error',
        error.message || 'Failed to create account. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isAdminSignUp ? 'Admin Registration' : 'Create Account'}</Text>

      <Text style={styles.subtitle}>New here? Connect with trusted boat owners and experienced fishermen</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      
      {/* Conditionally render role selection section */}
      {!isAdminSignUp && (
        <View>
          <Text style={styles.roleTitle}>Select your role:</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleButton, role === 'fisherman' && styles.roleButtonSelected]}
              onPress={() => setRole('fisherman')}
            >
              <Text style={[styles.roleButtonText, role === 'fisherman' && styles.roleButtonTextSelected]}>Fisherman</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, role === 'boat_owner' && styles.roleButtonSelected]}
              onPress={() => setRole('boat_owner')}
            >
              <Text style={[styles.roleButtonText, role === 'boat_owner' && styles.roleButtonTextSelected]}>Boat Owner</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity 
        style={styles.signUpButton} 
        onPress={handleSignUp}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.signUpButtonText}>Sign Up</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/(auth)/sign-in/sign-in')}>
        <Text style={styles.signInText}>Already have an account? Sign In</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SignUp;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#74E0EB',
    textAlign: 'center',
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  roleTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    marginTop: 5,
    textAlign: 'center',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', // This might get crowded with 3 buttons
    // Consider changing to space-between or allow wrapping / scroll
    marginBottom: 25,
  },
  roleButton: {
    paddingVertical: 12,
    paddingHorizontal: 20, // Adjusted padding for potentially smaller buttons
    borderWidth: 1,
    borderColor: '#74E0EB',
    borderRadius: 25,
    marginHorizontal: 5, // Add some margin between buttons
  },
  roleButtonSelected: {
    backgroundColor: '#74E0EB',
  },
  roleButtonText: {
    color: '#74E0EB',
    fontSize: 16,
    fontWeight: '600',
  },
  roleButtonTextSelected: {
    color: '#fff',
  },
  signUpButton: {
    backgroundColor: '#74E0EB',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signInText: {
    color: '#74E0EB',
    textAlign: 'center',
    fontSize: 16,
  },
});