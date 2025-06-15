import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
export default function Index() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/(auth)/auth-options');
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/logo.png')}
        style={styles.imageFallback}
        resizeMode="contain"/>
      <Text style={styles.title}>FishCrew</Text>
      <Text style={styles.subtitle}>Connect</Text>
      <Image
        source={require('../assets/images/fish.png')}
        style={styles.image}
        resizeMode="contain"
        onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
      />
      <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
        <Text style={styles.buttonText}>GET STARTED</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#44DBE9',
  },
  subtitle: {
    fontSize: 24,
    color: '#44DBE9',
    marginBottom: 20,
  },
  image: {
    width: 250,
    height: 250,
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#44DBE9',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  imageFallback: {
    width: 200,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  imageFallbackText: {
    fontSize: 48,
  },
});