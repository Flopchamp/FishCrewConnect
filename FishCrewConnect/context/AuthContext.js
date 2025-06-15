import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, userAPI } from '../services/api';
import { useRouter } from 'expo-router';

// Create context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Initialize - check if user is logged in and fetch their profile
  useEffect(() => {
    const loadStorageData = async () => {
      try {
        // Get stored token and user
        const storedToken = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('user');
        
        if (storedToken && storedUser) {
          // Set the token first to ensure API requests are authenticated
          setToken(storedToken);
          
          // Parse the stored user data
          const userData = JSON.parse(storedUser);
          setUser(userData);
          
          // Try to fetch the full profile from the backend now that we're authenticated
          try {
            const profileData = await userAPI.getProfile();
            
            if (profileData) {
              // Update the user state with the fresh profile data
              setUser(profileData);
              
              // Also update the stored user data for future app launches
              await AsyncStorage.setItem('user', JSON.stringify(profileData));
              
              // Navigate based on user type
              if (userData.user_type === 'boat_owner') {
                router.replace('/(tabs)'); // Boat owners see the main app with their jobs
              } else {
                router.replace('/(tabs)'); // Fishermen also see the main app (job listings)
              }
            }
          } catch (profileError) {
            console.error('Failed to fetch fresh profile data:', profileError);
            
            // Check if it's an auth error (expired token)
            if (profileError && profileError.isAuthError) {
              console.log('Auth token expired during initialization');
              // Clear stored data
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('user');
              setToken(null);
              setUser(null);
              // No need to redirect as the user will be shown the login screen
            } else {
              // For other errors, continue with stored data and still navigate
              if (userData.user_type === 'boat_owner') {
                router.replace('/(tabs)'); // Boat owners see the main app with their jobs
              } else {
                router.replace('/(tabs)'); // Fishermen also see the main app (job listings)
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to load auth data from storage:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStorageData();
    // No need for event listeners in React Native - auth errors are handled by our API interceptors
  }, [router]);

  // Sign in
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      
      // Enhanced validation
      if (!email || typeof email !== 'string' || email.trim() === '') {
        throw new Error('A valid email address is required');
      }
      
      if (!password || typeof password !== 'string' || password.trim() === '') {
        throw new Error('Password is required');
      }
      
      const response = await authAPI.signIn(email, password);
      
      // Improved response validation
      if (!response) {
        throw new Error('No response received from the server');
      }
      
      if (!response.token) {
        throw new Error('Authentication token not provided');
      }
      
      if (!response.user) {
        throw new Error('User information not provided');
      }
      
      // Validate user object has the required fields
      if (!response.user.user_type) {
        console.warn('User type not specified in the response, defaulting to fisherman');
        response.user.user_type = 'fisherman';
      }
      
      // First, save the basic auth response
      setUser(response.user);
      setToken(response.token);
      
      // Save token in storage
      await AsyncStorage.setItem('token', response.token);
      
      // Try to fetch the full profile now that we're authenticated
      try {
        const profileData = await userAPI.getProfile();
        
        if (profileData) {
          // Update with full profile data
          setUser(profileData);
          await AsyncStorage.setItem('user', JSON.stringify(profileData));
        } else {
          // Fall back to basic user data if profile fetch returns nothing
          await AsyncStorage.setItem('user', JSON.stringify(response.user));
        }
      } catch (profileError) {
        console.error('Failed to fetch profile after login:', profileError);
        // Still save the basic user data if profile fetch fails
        await AsyncStorage.setItem('user', JSON.stringify(response.user));
      }
      
      // Navigate based on user type - safely check user_type
      const userType = response.user.user_type;
      console.log('Navigating based on user type:', userType);
      
      if (userType === 'boat_owner') {
        router.replace('/(tabs)'); // Boat owners see the main app with their jobs
      } else {
        router.replace('/(tabs)'); // Fishermen also see the main app (job listings)
      }
      
      return response;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign up
  const signUp = async (userData) => {
    try {
      setLoading(true);
      const response = await authAPI.signUp(userData);
      return response;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      
      // Clear storage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      
      // Clear state
      setUser(null);
      setToken(null);
      
      // Navigate to splash page (index.jsx)
      router.replace('/');
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      
      // Call API to update profile
      const response = await userAPI.updateProfile(userData);
      
      if (response) {
        // Use the response data from the API
        setUser(response);
        
        // Update stored user data
        await AsyncStorage.setItem('user', JSON.stringify(response));
      } else {
        // Fallback: Update local user state with new data
        const updatedUser = { ...user, ...userData };
        setUser(updatedUser);
        
        // Update stored user data
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      return response;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  // Handle authentication errors from API
  const handleAuthError = async (error) => {
    // Check if it's an auth error
    if (error && error.isAuthError) {
      console.log('Authentication error detected, logging out');
      await signOut();
      // No need to call router.replace('/') as signOut already does this
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        token, 
        loading, 
        signIn, 
        signUp, 
        signOut,
        updateProfile,
        handleAuthError,
        isAuthenticated: !!user 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
