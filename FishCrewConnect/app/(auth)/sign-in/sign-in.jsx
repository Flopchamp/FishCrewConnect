import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';

const SignIn = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuth();
    // Use any development credentials that might be passed via params
  useEffect(() => {
    if (params.devEmail) {
      setEmail(params.devEmail.toString());
    }
    if (params.devPassword) {
      setPassword(params.devPassword.toString());
    }
  }, [params.devEmail, params.devPassword]);  const handleSignIn = async () => {
    // Enhanced validation
    if (!email || typeof email !== 'string' || email.trim() === '') {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    
    if (!password || typeof password !== 'string' || password.trim() === '') {
      Alert.alert('Error', 'Please enter your password.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log('Attempting to sign in with:', { email: typeof email === 'string' ? email : 'invalid email' });
      
      // Ensure we're passing valid string values
      const safeEmail = typeof email === 'string' ? email.trim() : '';
      const safePassword = typeof password === 'string' ? password : '';
      
      // Try to sign in using AuthContext
      const response = await signIn(safeEmail, safePassword);
      
      // Check if we got a response with user data
      if (response && response.user) {        // Sign-in was successful
        console.log('Sign-in successful:', response.user.user_type || 'unknown user type');
      } else {
        console.log('Sign-in response received but user data is incomplete');
      }
      
    } catch (error) {
      console.error('Sign-in error:', error);
      let errorMessage = 'Failed to sign in. Please check your credentials.';
      
      // Extract the most useful error message for the user
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.originalError?.message) {
        errorMessage = `${error.originalError.message} (${error.originalError.code || 'Unknown code'})`;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
        // Show a user-friendly error message
      Alert.alert(
        'Sign-in Error',
        errorMessage,
        [
          {
            text: 'Try Again',
            style: 'default'
          }
        ]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    // Navigate to forgot password screen
    router.push('/(auth)/forgot-password');
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/images/icon.png')} 
        style={styles.logo}
        resizeMode="contain"
      />      <Text style={styles.title}>Welcome Back!</Text>
      <Text style={styles.subtitle}>Already part of the crew? Sign in and get fishing</Text>

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
      />      <TouchableOpacity onPress={handleForgotPassword}>
        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.signInButton} 
        onPress={handleSignIn}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.signInButtonText}>Sign In</Text>
        )}
      </TouchableOpacity>      <TouchableOpacity onPress={() => router.push('/(auth)/sign-up/signUp')}>
        <Text style={styles.signUpText}>Don&#39;t have an account? Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SignIn;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
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
  forgotPasswordText: {
    color: '#44DBE9',
    textAlign: 'right',
    marginBottom: 20,
    fontSize: 14,
  },
  signInButton: {
    backgroundColor: '#44DBE9',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },  signUpText: {
    color: '#44DBE9',
    textAlign: 'center',
    fontSize: 16,
  },
});