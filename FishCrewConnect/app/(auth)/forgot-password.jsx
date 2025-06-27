import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { authAPI } from '../../services/api';

const ForgotPassword = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleForgotPassword = async () => {
    // Enhanced validation
    if (!email || typeof email !== 'string' || email.trim() === '') {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Check if email exists in the system
      const response = await authAPI.checkEmailExists(email.trim());

      if (response.exists) {
        // Email exists, send OTP
        const otpResponse = await authAPI.sendOTP(email.trim());
        
        if (otpResponse.success) {
          Alert.alert(
            'OTP Sent! 📧', 
            'A 6-digit verification code has been sent to your email. Please check your inbox.',
            [
              { 
                text: 'Continue', 
                onPress: () => router.push(`/(auth)/verify-otp?email=${encodeURIComponent(email.trim())}`)
              }
            ]
          );
        } else {
          Alert.alert('Error', 'Failed to send OTP. Please try again.');
        }
      } else {
        // Email doesn't exist
        Alert.alert(
          'Email Not Found', 
          'No account found with this email address. Please check your email or create a new account.',
          [
            { text: 'Try Again', style: 'default' },
            { 
              text: 'Sign Up', 
              onPress: () => router.push('/(auth)/signup')
            }
          ]
        );
      }
      
    } catch (error) {
      console.error('Forgot password error:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/icon.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
      
      <Text style={styles.title}>Forgot Password?</Text>
      <Text style={styles.subtitle}>
        Enter your email address to receive a verification code for password reset.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TouchableOpacity 
        style={styles.resetButton} 
        onPress={handleForgotPassword}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.resetButtonText}>Send Verification Code</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backText}>Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ForgotPassword;

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
    lineHeight: 22,
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  resetButton: {
    backgroundColor: '#44DBE9',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backText: {
    color: '#44DBE9',
    textAlign: 'center',
    fontSize: 16,
  },
});
