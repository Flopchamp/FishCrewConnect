import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Image, 
  Alert, 
  ScrollView, 
  ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import SafeScreenWrapper from '../components/SafeScreenWrapper';
import HeaderBox from '../components/HeaderBox';
import FormInput from '../components/FormInput';
import CustomButton from '../components/CustomButton';

const EditProfileScreen = () => {
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);  
  const [profileData, setProfileData] = useState({
    name: '',
    location: '',
    contact_number: '',
    bio: '',
    years_experience: '',
    specialties: '',
    skills: '',
    organization_name: '',
    available: true,
  });
  
  const [profileImage, setProfileImage] = useState(null);
  
  useEffect(() => {
    if (user) {
      // Initialize form with user data
      setProfileData({
        name: user.name || '',
        location: user.location || '',
        contact_number: user.contact_number || '',
        bio: user.bio || '',
        years_experience: user.years_experience ? user.years_experience.toString() : '',
        specialties: Array.isArray(user.specialties) ? user.specialties.join(', ') : '',
        skills: Array.isArray(user.skills) ? user.skills.join(', ') : '',
        organization_name: user.organization_name || '',
        available: user.available !== undefined ? user.available : true,
      });
      
      if (user.profile_image) {
        setProfileImage(user.profile_image);
      }
    }
  }, [user]);
  
  const handleChange = (field, value) => {
    setProfileData({
      ...profileData,
      [field]: value,
    });
  };
  
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library to change your profile image.');
      return;
    }
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };
  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Validate required fields
      const validationErrors = [];
      
      if (!profileData.name.trim()) {
        validationErrors.push('Name is required');
      }
      
      if (user?.user_type === 'fisherman' && profileData.years_experience && 
          (isNaN(parseInt(profileData.years_experience)) || parseInt(profileData.years_experience) < 0)) {
        validationErrors.push('Years of experience must be a valid positive number');
      }
      
      if (user?.user_type === 'boat_owner' && !profileData.organization_name?.trim()) {
        validationErrors.push('Organization name is required for boat owners');
      }
      
      // Validate contact number format (only digits allowed)
      if (profileData.contact_number && profileData.contact_number.trim()) {
        const contactStr = profileData.contact_number.trim();
        if (!/^\d+$/.test(contactStr)) {
          validationErrors.push('Contact number should only contain digits');
        }
      }
      
      if (validationErrors.length > 0) {
        Alert.alert(
          'Validation Error', 
          validationErrors.join('\n'),
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }
      
      // Convert comma-separated strings to arrays
      const specialtiesArray = profileData.specialties
        ? profileData.specialties.split(',').map(item => item.trim()).filter(Boolean)
        : [];
        
      const skillsArray = profileData.skills
        ? profileData.skills.split(',').map(item => item.trim()).filter(Boolean)
        : [];
      
      // Prepare data for API
      const updatedData = {
        ...profileData,
        specialties: specialtiesArray,
        skills: skillsArray,
        years_experience: profileData.years_experience 
          ? parseInt(profileData.years_experience, 10) 
          : 0,
        available: profileData.available === true || profileData.available === 'true',
      };
      
      // If image has changed, include it
      if (profileImage && profileImage !== user.profile_image) {
        updatedData.profile_image = profileImage;
      }
      
      // Show saving indicator
      setIsLoading(true);
        // Update profile through context/API with JWT authentication
      const updatedUser = await updateProfile(updatedData);
      
      // Update local profile image state with the new URL from server
      if (updatedUser && updatedUser.profile_image) {
        // Add timestamp to prevent caching issues with new images
        const imageUrl = updatedUser.profile_image.includes('?') 
          ? updatedUser.profile_image 
          : `${updatedUser.profile_image}?t=${Date.now()}`;
        setProfileImage(imageUrl);
      }
      
      // Success handler after successful database update
      Alert.alert(
        'Success', 
        'Profile updated successfully. Your changes have been saved to the database.', 
        [{ text: 'OK', onPress: () => router.back() }]
      );    } catch (error) {
      console.error('Failed to update profile:', error);
      
      // Check if it's an authentication error
      if (error && error.isAuthError) {
        // Auth error will be handled by the AuthContext
        // Nothing to do here as the user will be redirected to login
        return;
      }
      
      // Extract meaningful error messages from the error object if available
      let errorMessage = 'Failed to update profile. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show detailed error to the user
      Alert.alert(
        'Profile Update Failed', 
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };
    return (
    <SafeScreenWrapper scrollable>
      <HeaderBox 
        title="Edit Profile" 
        showBackButton
      />
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#44DBE9" />
          <Text style={styles.loadingText}>Saving your profile...</Text>
        </View>
      )}
      
      <ScrollView style={styles.container} pointerEvents={isLoading ? 'none' : 'auto'}>
        <View style={styles.imageSection}>
          <TouchableOpacity 
            style={styles.imageContainer}
            onPress={handlePickImage}
          >
            {profileImage ? (
              <Image 
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            <View style={styles.cameraIconContainer}>
              <Ionicons name="camera" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
        
        <FormInput
          label="Name *"
          value={profileData.name}
          onChangeText={(text) => handleChange('name', text)}
          leftIcon="person-outline"
        />
        
        <FormInput
          label="Location"
          value={profileData.location}
          onChangeText={(text) => handleChange('location', text)}
          leftIcon="location-outline"
          placeholder="City, State"
        />
        
        <FormInput
          label="Contact Number"
          value={profileData.contact_number}
          onChangeText={(text) => handleChange('contact_number', text)}
          leftIcon="call-outline"
          keyboardType="numeric"
          placeholder="Enter digits only"
        />
          {user?.user_type === 'fisherman' && (
          <>
            <FormInput
              label="Years of Experience"
              value={profileData.years_experience}
              onChangeText={(text) => handleChange('years_experience', text)}
              leftIcon="time-outline"
              keyboardType="numeric"
            />
            
            <FormInput
              label="Specialties"
              value={profileData.specialties}
              onChangeText={(text) => handleChange('specialties', text)}
              leftIcon="star-outline"
              placeholder="Comma-separated list of specialties (e.g., Tuna, Grouper, Snapper)"
            />
            
            <FormInput
              label="Skills"
              value={profileData.skills}
              onChangeText={(text) => handleChange('skills', text)}
              leftIcon="construct-outline"
              placeholder="Comma-separated list of skills (e.g., Navigation, First Aid)"
            />
            
            <View style={styles.switchContainer}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#44DBE9" style={styles.switchIcon} />
              <Text style={styles.switchLabel}>Available for work</Text>
              <TouchableOpacity 
                style={[
                  styles.toggleButton, 
                  profileData.available ? styles.toggleActive : styles.toggleInactive
                ]}
                onPress={() => handleChange('available', !profileData.available)}
              >
                <View style={[
                  styles.toggleIndicator, 
                  profileData.available ? styles.indicatorActive : styles.indicatorInactive
                ]} />
              </TouchableOpacity>
            </View>
          </>
        )}
        
        {user?.user_type === 'boat_owner' && (
          <>
            <FormInput
              label="Organization/Company Name"
              value={profileData.organization_name}
              onChangeText={(text) => handleChange('organization_name', text)}
              leftIcon="business-outline"
              placeholder="Your company or boat name"
            />
            
            <View style={styles.switchContainer}>
              <Ionicons name="boat-outline" size={24} color="#44DBE9" style={styles.switchIcon} />
              <Text style={styles.switchLabel}>Available for hiring crew</Text>
              <TouchableOpacity 
                style={[
                  styles.toggleButton, 
                  profileData.available ? styles.toggleActive : styles.toggleInactive
                ]}
                onPress={() => handleChange('available', !profileData.available)}
              >
                <View style={[
                  styles.toggleIndicator, 
                  profileData.available ? styles.indicatorActive : styles.indicatorInactive
                ]} />
              </TouchableOpacity>
            </View>
          </>
        )}
        
        <FormInput
          label="Bio"
          value={profileData.bio}
          onChangeText={(text) => handleChange('bio', text)}
          leftIcon="information-circle-outline"
          multiline
          inputProps={{
            textAlignVertical: 'top',
            numberOfLines: 5,
            minHeight: 100,
          }}
        />
        
        <View style={[styles.buttonContainer, { paddingBottom: 50 }]}>
          <CustomButton
            title="Save Changes"
            onPress={handleSave}
            isLoading={isLoading}
            fullWidth
            icon="save-outline"
          />
        </View>
      </ScrollView>
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#44DBE9',
    fontWeight: 'bold',
  },
  imageSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  imageContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0077B6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cameraIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 119, 182, 0.8)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 12,
  },
  switchIcon: {
    marginRight: 10,
  },
  switchLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  toggleButton: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#44DBE9',
  },
  toggleInactive: {
    backgroundColor: '#D1D1D1',
  },
  toggleIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  indicatorActive: {
    transform: [{ translateX: 22 }],
  },
  indicatorInactive: {
    transform: [{ translateX: 0 }],
  },
  buttonContainer: {
    marginVertical: 24,
    paddingbottom: 50,
  },
});

export default EditProfileScreen;
