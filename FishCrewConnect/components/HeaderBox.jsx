import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

/**
 * HeaderBox component - Reusable header for screen titles with optional back button
 * @param {string} title - The title to display in the header
 * @param {boolean} showBackButton - Whether to show a back button (default: false)
 * @param {function} onBackPress - Custom back button handler (optional)
 * @param {React.ReactNode} rightComponent - Optional component to display on the right side
 * @param {React.ReactNode} children - Optional child components to render in right section
 */
const HeaderBox = ({ 
  title, 
  showBackButton = false, 
  onBackPress,
  rightComponent,
  children
}) => {
  const router = useRouter();
  
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {showBackButton && (
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#0077B6" />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
        {(rightComponent || children) && (
        <View style={styles.rightSection}>
          {rightComponent}
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  rightSection: {
    alignItems: 'center',
    justifyContent: 'center',
  }
});

export default HeaderBox;