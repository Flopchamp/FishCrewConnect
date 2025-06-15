import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';

const AuthOptions = () => {
  const router = useRouter();

  const handleGoogleSignIn = () => {
    // Placeholder for Google Sign-In logic
    console.log('Attempting Google Sign-In...');
    // You would integrate with Expo's Google Sign-In or a similar library here
    // On success, navigate to the main app: router.replace('/(tabs)');
    alert('Google Sign-In (Not Implemented)');
  };

  const handleCreateAccount = () => {
    router.push('/(auth)/sign-up/signUp'); // Navigate to your existing sign-up screen
  };
  const handleBoatOwnerSignUp = () => {
    // Navigate to sign-up with boat_owner role parameter
    router.push({
      pathname: '/(auth)/sign-up/signUp',
      params: { userRole: 'boat_owner' }, // Using consistent naming that matches backend
    });
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/icon.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Welcome to FishCrew Connect</Text>
      <Text style={styles.subtitle}>Find your next catch or crew member</Text>      <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
        <Image 
          source={require('../../assets/images/google.png')} 
          style={styles.googleIcon} 
          resizeMode="contain" 
        />
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </TouchableOpacity>      
      <TouchableOpacity style={styles.createAccountButton} onPress={() => router.push('/(auth)/sign-in/sign-in')}>
        <Text style={styles.createAccountButtonText}>Sign In</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.createAccountButton} onPress={handleCreateAccount}>
        <Text style={styles.createAccountButtonText}>Create Account</Text>
      </TouchableOpacity>      
        <View style={styles.boatOwnerContainer}>
        <Text style={styles.boatOwnerText}>Are you a boat owner? </Text>
        <TouchableOpacity onPress={handleBoatOwnerSignUp}>
          <Text style={styles.boatOwnerLink}>Sign up here</Text>
        </TouchableOpacity>
      </View>{__DEV__ && (
        <View style={styles.devBox}>
          <Text style={styles.devText}>Development Credentials:</Text>
          <TouchableOpacity onPress={() => router.push({
            pathname: '/(auth)/sign-in/sign-in',
            params: { devEmail: 'fisherman@test.com', devPassword: 'password123' }
          })}>
            <Text style={styles.devCredentials}>Fisherman Account:</Text>
            <Text style={styles.devCredentials}>Email: fisherman@test.com</Text>
            <Text style={styles.devCredentials}>Password: password123</Text>
            <Text style={styles.devAction}>Tap to auto-fill fisherman sign in</Text>
          </TouchableOpacity>
          
          <View style={styles.devDivider} />
          
          <TouchableOpacity onPress={() => router.push({
            pathname: '/(auth)/sign-in/sign-in',
            params: { devEmail: 'boat@test.com', devPassword: 'password123' }
          })}>
            <Text style={styles.devCredentials}>Boat Owner Account:</Text>
            <Text style={styles.devCredentials}>Email: boat@test.com</Text>
            <Text style={styles.devCredentials}>Password: password123</Text>
            <Text style={styles.devAction}>Tap to auto-fill boat owner sign in</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default AuthOptions;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  googleButton: {
    backgroundColor: '#4285F4', // Google's blue
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  googleIcon: { 
    width: 20, 
    height: 20, 
    marginRight: 10, 
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createAccountButton: {
    backgroundColor: '#44DBE9', 
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  createAccountButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  boatOwnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  boatOwnerText: {
    fontSize: 14,
    color: '#333',
  },
  boatOwnerLink: {
    fontSize: 14,
    color: '#44DBE9',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  signInLinkContainer: {
    marginTop: 20,
  },  signInLink: {
    fontSize: 14,
    color: '#44DBE9',
  },
  devBox: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    width: '100%',
  },
  devText: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#888',
  },
  devCredentials: {
    color: '#666',
    fontFamily: 'monospace',
  },
  devAction: {
    color: '#44DBE9',
    marginTop: 5,
    fontStyle: 'italic',
    fontWeight: 'bold',
  },
  devDivider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 10,
  },
});
