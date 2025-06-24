import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';

const AuthOptions = () => {
  const router = useRouter();

  const handleCreateAccount = () => {
    router.push('/(auth)/sign-up/signUp'); // Navigate to your existing sign-up screen
  };const handleAdminSignUp = () => {
    // Navigate to sign-up with admin role parameter
    router.push({
      pathname: '/(auth)/sign-up/signUp',
      params: { userRole: 'admin' },
    });
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/icon.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Welcome to FishCrew Connect</Text>      <Text style={styles.subtitle}>Find your next catch or crew member</Text>
      
      <TouchableOpacity style={styles.createAccountButton} onPress={() => router.push('/(auth)/sign-in/sign-in')}>
        <Text style={styles.createAccountButtonText}>Sign In</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.createAccountButton} onPress={handleCreateAccount}>
        <Text style={styles.createAccountButtonText}>Create Account</Text>
      </TouchableOpacity>        <View style={styles.boatOwnerContainer}>
        <Text style={styles.boatOwnerText}>Are you an admin? </Text>
        <TouchableOpacity onPress={handleAdminSignUp}>
          <Text style={styles.boatOwnerLink}>Sign up here</Text>
        </TouchableOpacity>
      </View>
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
  },  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
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
});
