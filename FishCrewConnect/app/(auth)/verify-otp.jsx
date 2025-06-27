import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authAPI } from '../../services/api';

const VerifyOTP = () => {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // Validate that we have an email parameter
    if (!email) {
      Alert.alert(
        'Error', 
        'No email provided. Please go back and try again.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [email, router]);

  useEffect(() => {
    // Countdown timer for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerifyOTP = async () => {
    // Validation
    if (!otpCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code.');
      return;
    }

    if (otpCode.length !== 6) {
      Alert.alert('Error', 'Verification code must be 6 digits.');
      return;
    }

    if (!email) {
      Alert.alert('Error', 'Email not found. Please go back and try again.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const response = await authAPI.verifyOTP(email, otpCode);

      if (response.success) {
        Alert.alert(
          'Verification Successful! ✅', 
          'Your code has been verified. You can now reset your password.',
          [
            { 
              text: 'Continue', 
              onPress: () => router.push(`/(auth)/reset-password?email=${encodeURIComponent(email)}`)
            }
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Invalid verification code. Please try again.');
      }
      
    } catch (error) {
      console.error('Verify OTP error:', error);
      
      let errorMessage = 'Invalid or expired verification code. Please try again.';
      if (error.message) {
        if (error.message.includes('expired')) {
          errorMessage = 'Verification code has expired. Please request a new one.';
        } else if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your connection.';
        }
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;

    try {
      setIsResending(true);
      
      const response = await authAPI.sendOTP(email);
      
      if (response.success) {
        Alert.alert(
          'Code Resent! 📧',
          'A new verification code has been sent to your email.',
          [{ text: 'OK' }]
        );
        setCountdown(60); // 60 second cooldown
        setOtpCode(''); // Clear current input
      } else {
        Alert.alert('Error', 'Failed to resend verification code. Please try again.');
      }
      
    } catch (error) {
      console.error('Resend OTP error:', error);
      Alert.alert('Error', 'Failed to resend verification code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/icon.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
      
      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>
        We&apos;ve sent a 6-digit verification code to:{'\n'}
        <Text style={styles.emailText}>{email}</Text>
      </Text>

      <Text style={styles.instructionText}>
        Enter the verification code below:
      </Text>

      <TextInput
        style={styles.otpInput}
        placeholder="000000"
        value={otpCode}
        onChangeText={(text) => setOtpCode(text.replace(/[^0-9]/g, '').substring(0, 6))}
        keyboardType="numeric"
        maxLength={6}
        autoCapitalize="none"
        autoCorrect={false}
        textAlign="center"
      />

      <TouchableOpacity 
        style={[
          styles.verifyButton,
          (otpCode.length !== 6 || isSubmitting) && styles.verifyButtonDisabled
        ]} 
        onPress={handleVerifyOTP}
        disabled={otpCode.length !== 6 || isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.verifyButtonText}>Verify Code</Text>
        )}
      </TouchableOpacity>

      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Didn&apos;t receive the code?</Text>
        <TouchableOpacity 
          onPress={handleResendOTP}
          disabled={countdown > 0 || isResending}
          style={styles.resendButton}
        >
          {isResending ? (
            <ActivityIndicator size="small" color="#44DBE9" />
          ) : (
            <Text style={[
              styles.resendButtonText,
              (countdown > 0) && styles.resendButtonTextDisabled
            ]}>
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
};

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
    marginBottom: 20,
    lineHeight: 22,
  },
  emailText: {
    fontWeight: 'bold',
    color: '#44DBE9',
  },
  instructionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  otpInput: {
    height: 60,
    borderColor: '#44DBE9',
    borderWidth: 2,
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 15,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
  },
  verifyButton: {
    backgroundColor: '#44DBE9',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyButtonDisabled: {
    backgroundColor: '#ccc',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  resendButtonText: {
    color: '#44DBE9',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendButtonTextDisabled: {
    color: '#999',
  },
  backText: {
    color: '#44DBE9',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default VerifyOTP;
