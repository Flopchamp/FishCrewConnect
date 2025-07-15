import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

// Base URL of your API is imported from config/api.js

// Flag to prevent multiple refresh attempts happening at the same time
let isRefreshing = false;
// Store pending requests that should be retried after token refresh
let pendingRequests = [];

// Create an axios instance with timeout and retry logic
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  async config => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token for request:', error);
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  async error => {
    console.log('API Error:', error.message);
    
    const originalRequest = error.config;
    
    // Check if it's a 401 error (unauthorized) and it's not a refresh token request
    // and we haven't already tried to refresh for this request
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      !originalRequest.url.includes('/api/auth/refresh')
    ) {
      // Check if we're already refreshing the token
      if (!isRefreshing) {
        console.log('Token expired, attempting to refresh...');
        isRefreshing = true;
        originalRequest._retry = true;
        
        try {
          // Get the old token from storage
          const oldToken = await AsyncStorage.getItem('token');
          
          if (!oldToken) {            console.log('No token found for refresh');
            // Clear any user data and redirect to login
            AsyncStorage.removeItem('user');
            AsyncStorage.removeItem('token');
            // Handle this gracefully by just rejecting with a special error
            return Promise.reject({
              ...error,
              isAuthError: true,
              authExpired: true
            });
          }
          
          // Try to refresh the token
          const response = await authAPI.refreshToken(oldToken);
          
          if (response && response.token) {
            console.log('Token refreshed successfully');
            
            // Save the new token
            await AsyncStorage.setItem('token', response.token);
            
            // Update the user data
            if (response.user) {
              await AsyncStorage.setItem('user', JSON.stringify(response.user));
            }
            
            // Update Authorization header for the original request
            originalRequest.headers.Authorization = `Bearer ${response.token}`;
            
            // Resolve all pending requests
            pendingRequests.forEach(cb => cb(response.token));
            pendingRequests = [];
            
            // Retry the original request
            return api(originalRequest);
          } else {
            throw new Error('Refresh token response invalid');
          }
        } catch (refreshError) {          console.error('Token refresh failed:', refreshError);
          
          // If refresh fails, reject all pending requests and clear auth
          pendingRequests.forEach(cb => cb(null));
          pendingRequests = [];
          
          // Clear auth data
          await AsyncStorage.removeItem('user');
          await AsyncStorage.removeItem('token');
          
          // For React Native, reject with special auth error
          return Promise.reject({
            isAuthError: true,
            authExpired: true,
            message: 'Authentication expired'
          });
        } finally {
          isRefreshing = false;
        }
      } else {
        // We're already refreshing, so queue this request
        console.log('Request queued during token refresh');
        return new Promise(resolve => {
          pendingRequests.push(token => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            } else {
              resolve(Promise.reject(error));
            }
          });
        });
      }
    }
      // No special handling for different URLs - always return real errors    // Always return the real error with more helpful message for common issues
    console.log('API error in response interceptor:', error.message || 'Unknown error');
    
    // Format specific error types for better error handling
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return Promise.reject({
          message: 'Connection timed out. Please check if the backend server is running.',
          originalError: error
        });
      }
      if (error.message?.includes('Network Error')) {
        return Promise.reject({
          message: 'Network connection error. Please check your internet connection and ensure the server is running at ' + API_URL,
          originalError: error
        });
      }
    }
    
    return Promise.reject(error);
  }
);

// No mock data or mock user function - app will use real backend data only

// Auth API methods
export const authAPI = {
  signUp: async (userData) => {
    try {
      const response = await api.post('/api/auth/signup', userData);
      return response.data;
    } catch (error) {
      console.error('Sign-up API error:', error.message || 'Unknown error');
      
      // Check for specific error cases to provide better messages
      if (!error.response) {
        if (error.code === 'ECONNABORTED') {
          throw { message: 'Connection timed out. Please try again.', originalError: error };
        }
        if (error.message?.includes('Network Error')) {
          throw { message: 'Network connection error. Please check your internet connection.', originalError: error };
        }
        throw { message: 'Could not reach the server. Please try again later.', originalError: error };
      }
      
      // Handle specific HTTP error codes
      const status = error.response?.status;
      if (status === 409) {
        throw { message: 'This email is already registered. Please sign in instead.', originalError: error };
      }
      if (status === 400) {
        throw { message: error.response.data?.message || 'Invalid registration data', originalError: error };
      }
      
      // Default error handling
      throw error.response?.data || { message: error.message, originalError: error };
    }
  },
  
  signIn: async (email, password) => {
    try {
      // Validate inputs before sending request
      if (!email || typeof email !== 'string' || email.trim() === '') {
        throw { message: 'A valid email address is required' };
      }
      
      if (!password || typeof password !== 'string' || password === '') {
        throw { message: 'Password is required' };
      }
      
      console.log(`Auth API: Attempting sign-in for ${email}`);
      const response = await api.post('/api/auth/signin', { email, password });
      console.log('Auth API: Sign-in successful');
      return response.data;
    } catch (error) {
      console.error('Sign-in API error:', error.message || 'Unknown error');
      
      // Check for various error conditions
      if (!error.response) {
        if (error.code === 'ECONNABORTED') {
          throw { message: 'Connection timed out. Please try again.', originalError: error };
        }
        if (error.message?.includes('Network Error')) {
          throw { message: 'Network connection error. Please check your internet connection.', originalError: error };
        }
        throw { message: 'Could not reach the server. Please try again later.', originalError: error };
      }
      
      // Handle specific HTTP error responses
      const status = error.response?.status;
      if (status === 401) {
        throw { message: 'Invalid email or password. Please check your credentials.', originalError: error };
      }
      if (status === 404) {
        throw { message: 'User not found. Please check your email or create an account.', originalError: error };
      }
      
      // Return the server's error message or a fallback
      throw error.response?.data || { message: error.message || 'Authentication failed', originalError: error };
    }
  },
  
  // Method to refresh the token
  refreshToken: async (oldToken) => {
    try {
      console.log('Auth API: Refreshing token');
      // Use the old token one more time to get a fresh one
      const refreshResponse = await axios.post(
        `${API_URL}/api/auth/refresh`,
        {},
        { headers: { Authorization: `Bearer ${oldToken}` } }
      );
      
      console.log('Auth API: Token refreshed successfully');
      // Return the new token and user data
      return refreshResponse.data;
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError.message || 'Unknown error');
      
      if (!refreshError.response) {
        throw { message: 'Could not refresh authentication. Please sign in again.', originalError: refreshError };
      }
      
      throw { message: refreshError.response?.data?.message || 'Authentication session expired', originalError: refreshError };
    }
  },

  checkEmailExists: async (email) => {
    try {
      const response = await api.post('/api/auth/check-email', { email });
      return response.data;
    } catch (error) {
      console.error('Check email API error:', error.message || 'Unknown error');
      
      if (!error.response) {
        throw { message: 'Could not reach the server. Please check your connection.', originalError: error };
      }
      
      throw error.response?.data || { message: error.message, originalError: error };
    }
  },

  forgotPassword: async (email) => {
    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      console.error('Forgot password API error:', error.message || 'Unknown error');
      
      if (!error.response) {
        throw { message: 'Could not reach the server. Please check your connection.', originalError: error };
      }
      
      throw error.response?.data || { message: error.message, originalError: error };
    }
  },

  resetPassword: async (token, newPassword) => {
    try {
      const response = await api.post('/api/auth/reset-password', { token, newPassword });
      return response.data;
    } catch (error) {
      console.error('Reset password API error:', error.message || 'Unknown error');
      
      if (!error.response) {
        throw { message: 'Could not reach the server. Please check your connection.', originalError: error };
      }
      
      throw error.response?.data || { message: error.message, originalError: error };
    }
  },

  resetPasswordDirect: async (email, newPassword) => {
    try {
      const response = await api.post('/api/auth/reset-password-direct', { email, newPassword });
      return response.data;
    } catch (error) {
      console.error('Reset password direct API error:', error.message || 'Unknown error');
      
      if (!error.response) {
        throw { message: 'Could not reach the server. Please check your connection.', originalError: error };
      }
      
      throw error.response?.data || { message: error.message, originalError: error };
    }
  },

  sendOTP: async (email) => {
    try {
      const response = await api.post('/api/auth/send-otp', { email });
      return response.data;
    } catch (error) {
      console.error('Send OTP API error:', error.message || 'Unknown error');
      
      if (!error.response) {
        throw { message: 'Could not reach the server. Please check your connection.', originalError: error };
      }
      
      throw error.response?.data || { message: error.message, originalError: error };
    }
  },

  verifyOTP: async (email, otp) => {
    try {
      const response = await api.post('/api/auth/verify-otp', { email, otp });
      return response.data;
    } catch (error) {
      console.error('Verify OTP API error:', error.message || 'Unknown error');
      
      if (!error.response) {
        throw { message: 'Could not reach the server. Please check your connection.', originalError: error };
      }
      
      throw error.response?.data || { message: error.message, originalError: error };
    }
  }
};

// Jobs API methods
const jobsAPI = {
  getAllJobs: async () => {
    try {
      const response = await api.get('/api/jobs');
      return response.data;
    } catch (error) {
      console.error('Get all jobs error:', error);
      throw error.response?.data || { message: error.message || 'Failed to fetch jobs' };
    }
  },
  getJob: async (jobId) => {
    try {
      const response = await api.get(`/api/jobs/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Get job error:', error);
      throw error.response?.data || { message: error.message || `Failed to fetch job ${jobId}` };
    }
  },
    createJob: async (jobData) => {
    try {
      const response = await api.post('/api/jobs', jobData);
      return response.data;
    } catch (error) {
      console.error('API Error - createJob:', error.response?.data || error.message);
      throw error.response?.data || { message: 'Server error while creating job' };
    }
  },
  
  updateJob: async (jobId, jobData) => {
    try {
      const response = await api.put(`/api/jobs/${jobId}`, jobData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getMyJobs: async () => {
    try {
      console.log('Fetching my jobs');
      const response = await api.get('/api/jobs/my-jobs');
      console.log('My jobs response:', response.data);
      return response.data || [];
    } catch (error) {
      console.error('Get my jobs error:', error);
      throw error.response?.data || { message: error.message || 'Failed to fetch jobs' };
    }
  },
  
  deleteJob: async (jobId) => {
    try {
      const response = await api.delete(`/api/jobs/${jobId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Job Applications API methods
export const applicationsAPI = {
  applyForJob: async (jobId, file = null, coverLetter = '') => {
    try {
      const formData = new FormData();
      
      // Add cover letter to form data
      formData.append('cover_letter', coverLetter);
      
      // Add CV file if provided
      if (file) {
        formData.append('cv_file', {
          uri: file.uri,
          type: file.mimeType || 'application/pdf',
          name: file.name
        });
      }
      
      const response = await api.post(`/api/applications/job/${jobId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Apply for job error:', error);
      throw error.response?.data || { message: error.message || 'Failed to apply for job' };
    }
  },  getMyApplications: async () => {
    try {
      console.log('Fetching my applications');
      const response = await api.get('/api/applications/my');
      console.log('My applications response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Get my applications error:', error);
      throw error.response?.data || { message: error.message || 'Failed to fetch applications' };
    }
  },
    getJobApplications: async (jobId) => {
    try {
      console.log('Fetching applications for job:', jobId);
      const response = await api.get(`/api/applications/job/${jobId}`);
      console.log('Applications API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching job applications:', error.response?.data || error.message);
      throw error.response?.data || { message: error.message || 'Failed to fetch applications' };
    }
  },
    updateApplicationStatus: async (applicationId, status) => {
    try {
      const response = await api.put(`/api/applications/${applicationId}/status`, { status });
      
      // Return both the updated application and application ID for easier reference
      const data = {
        ...response.data,
        application_id: applicationId // Ensure application_id is always included in the response
      };
      return data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Notifications API methods
export const notificationsAPI = {  getNotifications: async () => {
    try {
      const response = await api.get('/api/notifications');
      return response.data;
    } catch (error) {
      console.error('Get notifications error:', error);
      throw error.response?.data || { message: error.message || 'Failed to fetch notifications' };
    }
  },
    markAsRead: async (notificationId) => {
    try {
      const response = await api.put(`/api/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Mark as read error:', error);
      throw error.response?.data || { message: error.message || 'Failed to mark notification as read' };
    }
  },
  
  markAllAsRead: async () => {
    try {
      const response = await api.put('/api/notifications/read-all');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// Reviews API methods
export const reviewsAPI = {
  createReview: async (reviewData) => {
    try {
      const response = await api.post('/api/reviews', reviewData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  
  getReviewsForUser: async (userId) => {
    try {
      const response = await api.get(`/api/reviews/user/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  
  getReviewsForJob: async (jobId) => {
    try {
      const response = await api.get(`/api/reviews/job/${jobId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

// User API methods
export const userAPI = {
  getContacts: async () => {
    try {
      const response = await api.get('/api/users/contacts');
      return response.data;
    } catch (error) {
      console.error('Get contacts error:', error);
      throw error.response?.data || error.message;
    }
  },
  getProfile: async () => {
    try {
      // Use the correct API endpoint to get the current user's profile
      const response = await api.get('/api/users/me');
      
      if (!response.data) {
        throw new Error('No profile data received from server');
      }
      
      // Enhance the profile with additional fields needed by the frontend
      // These should eventually be stored in the database
      const profileData = {
        ...response.data,
        // Add any missing fields with default values
        profile_image: response.data.profile_image || null,
        location: response.data.location || 'Location not specified',
        years_experience: response.data.years_experience || 0,
        bio: response.data.bio || '',
        specialties: response.data.specialties || [],
        skills: response.data.skills || [],
        available: response.data.available !== undefined ? response.data.available : true,
        rating: response.data.rating || 'N/A'
      };
      
      return profileData;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error.response?.data || { message: error.message || 'Failed to fetch profile data' };
    }
  },
    updateProfile: async (userData) => {
    try {
      // Check if profile image is included and is a file URI
      const hasProfileImage = userData.profile_image && 
                             (userData.profile_image.startsWith('file://') || 
                              userData.profile_image.startsWith('content://'));
      
      if (hasProfileImage) {
        // Use FormData for file upload
        const formData = new FormData();
        
        // Add profile image file
        formData.append('profile_image', {
          uri: userData.profile_image,
          type: 'image/jpeg',
          name: 'profile_image.jpg'
        });
        
        // Add other profile data
        Object.keys(userData).forEach(key => {
          if (key !== 'profile_image') {
            // Convert arrays to JSON strings for backend processing
            if (Array.isArray(userData[key])) {
              formData.append(key, JSON.stringify(userData[key]));
            } else {
              formData.append(key, userData[key]);
            }
          }
        });
        
        const response = await api.put('/api/users/me', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return response.data;
      } else {
        // Regular JSON update without file
        const response = await api.put('/api/users/me', userData);
        return response.data;
      }
    } catch (error) {
      console.error('Profile update error:', error);
      throw error.response?.data || error.message;
    }
  },
  getUserReviews: async (userId) => {
    try {
      const response = await api.get(`/api/users/${userId}/reviews`);
      return response.data;
    } catch (error) {
      console.error('Get user reviews error:', error);
      throw error.response?.data || { message: error.message || 'Failed to fetch user reviews' };
    }
  }
};

// Add alias for getJobById to maintain compatibility
jobsAPI.getJobById = jobsAPI.getJob;

// Add getJobOwner function that's being used in job details page
jobsAPI.getJobOwner = async (userId) => {
  try {
    // Always try to use the real backend first
    const response = await api.get(`/api/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Get job owner error:', error);
      // Return a descriptive error
    console.error('Could not fetch job owner data');
    throw error.response?.data || error.message;
  }
};

// Add getOwnerReviews function to fetch reviews for a job owner
jobsAPI.getOwnerReviews = async (userId) => {
  try {
    // Always try to use the real backend first
    const response = await api.get(`/api/reviews/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Get owner reviews error:', error);
      // Return a descriptive error    console.error('Could not fetch owner reviews');
    throw error.response?.data || { message: error.message || 'Failed to get owner reviews' };
  }
};

// Messages API methods
export const messagesAPI = {  getConversations: async () => {
    try {
      // Log authentication attempt
      console.log('Fetching conversations with auth token');
      const token = await AsyncStorage.getItem('token');
      console.log('Auth token available:', !!token);
      
      const response = await api.get('/api/messages/conversations');
      console.log(`Got ${response.data ? response.data.length : 0} conversations from server`);
      
      // Return empty array if no conversations to prevent UI errors
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Get conversations error:', error);
      
      // Handle auth errors gracefully
      if (error.response?.status === 401) {
        console.error('Authentication failed when loading conversations');
        throw new Error('Please sign in again to view your messages');
      }
      
      // Return empty array on error instead of throwing
      console.error('Returning empty conversations array due to error');
      return [];
    }
  },getMessages: async (otherUserId) => {
    try {
      // Ensure otherUserId is a number
      const userId = parseInt(otherUserId, 10);
      
      if (isNaN(userId)) {
        console.error(`Invalid user ID: ${otherUserId}`);
        throw new Error('Invalid user ID provided');
      }
      
      console.log(`API call: Getting messages with user ID ${userId}`);
      
      // Set a longer timeout for message loading
      const response = await api.get(`/api/messages/${userId}`, {
        timeout: 15000 // 15 seconds timeout for message loading
      });
      
      // Validate the data format
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          console.log(`API returned ${response.data.length} messages`);
          
          // Check if the array contains valid message objects
          const validMessages = response.data.filter(msg => 
            msg && typeof msg === 'object' && 
            (msg.id || msg.senderId || msg.text)
          );
          
          if (validMessages.length !== response.data.length) {
            console.warn(`Filtered out ${response.data.length - validMessages.length} invalid messages`);
          }
          
          return validMessages;
        } else {
          console.error('Invalid response format from API (not an array):', response.data);
          throw new Error('Invalid response format from server');
        }
      } else {
        console.error('Empty or null response data');
        throw new Error('Empty response from server');
      }
    } catch (error) {
      console.error('Get messages API error:', error);
      
      // Check for self-messaging error from backend
      if (error.response?.data?.code === 'SELF_MESSAGING_NOT_ALLOWED' ||
          error.response?.data?.message?.includes('self')) {
        console.error('Self-messaging attempt detected by backend');
        // Re-throw with specific error type that can be caught and handled properly
        throw {
          message: 'You cannot message yourself',
          isSelfMessagingError: true,
          response: error.response,
          originalError: error
        };
      }
      
      // Log more specific error details
      console.error('Error details:', error.response?.status, error.response?.data);
      
      // Provide more specific error logging based on the error type
      if (error.message?.includes('timeout')) {
        console.error('Request timed out when fetching messages');
        throw new Error('Request timed out. Please try again.');
      } else if (!error.response) {
        console.error('Network error or server unreachable');
        throw new Error('Network error. Please check your connection.');
      } else if (error.response?.status === 401) {
        console.error('Authentication error when fetching messages');
        throw new Error('Authentication error. Please log in again.');
      } else if (error.response?.status === 400) {
        console.error('Bad request error:', error.response?.data?.message);
        throw new Error(error.response?.data?.message || 'Invalid request');
      }
      
      // Default error handling - throw the error instead of silently returning empty array
      // This allows the UI to properly handle and show errors
      throw error;
    }
  },
    sendMessage: async (recipientId, text) => {
    try {
      const response = await api.post('/api/messages', { recipientId, text });
      return response.data;
    } catch (error) {
      console.error('Send message error:', error);
      throw error.response?.data || error.message;
    }
  },
    markAsRead: async (messageIds) => {
    try {
      const response = await api.put('/api/messages/read', { messageIds });
      return response.data;    } catch (error) {
      console.error('Mark messages as read error:', error);
      throw error.response?.data || error.message;
    }
  }
};

// Admin API
export const adminAPI = {
  getDashboardStats: async () => {
    try {
      console.log('Fetching admin dashboard statistics');
      const response = await api.get('/api/admin/dashboard/stats');
      console.log('Admin dashboard stats received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching admin dashboard stats:', error);
      if (error.response?.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
      throw new Error('Failed to load dashboard statistics. Please try again.');
    }
  },

  getUserStats: async () => {
    try {
      console.log('Fetching admin user statistics');
      const response = await api.get('/api/admin/users/stats');
      console.log('Admin user stats received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching admin user stats:', error);
      if (error.response?.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
      throw new Error('Failed to load user statistics. Please try again.');
    }
  },

  // User management methods
  getAllUsers: async (params) => {
    try {
      console.log('Fetching admin users with params:', params);
      const response = await api.get('/api/admin/users', { params });
      console.log('Admin users received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching admin users:', error);
      if (error.response?.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
      throw new Error('Failed to load users. Please try again.');
    }
  },

  getUserById: async (userId) => {
    try {
      console.log('Fetching admin user details for ID:', userId);
      const response = await api.get(`/api/admin/users/${userId}`);
      console.log('Admin user details received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching admin user details:', error);
      if (error.response?.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
      if (error.response?.status === 404) {
        throw new Error('User not found.');
      }
      throw new Error('Failed to load user details. Please try again.');
    }
  },
  updateUserStatus: async (userId, action, reason) => {
    try {
      console.log('Updating user status:', { userId, action, reason });
      const response = await api.put(`/api/admin/users/${userId}/status`, {
        action,
        reason
      });
      console.log('User status updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating user status:', error);
      if (error.response?.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
      if (error.response?.status === 404) {
        throw new Error('User not found.');
      }
      throw new Error('Failed to update user status. Please try again.');
    }
  },

  suspendUser: async (userId, reason) => {
    try {
      console.log('Suspending user:', { userId, reason });
      const response = await api.post(`/api/admin/users/${userId}/suspend`, {
        reason
      });
      console.log('User suspended:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error suspending user:', error);
      if (error.response?.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
      if (error.response?.status === 404) {
        throw new Error('User not found.');
      }
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'Cannot suspend this user.');
      }
      throw new Error('Failed to suspend user. Please try again.');
    }
  },

  unsuspendUser: async (userId, reason) => {
    try {
      console.log('Unsuspending user:', { userId, reason });
      const response = await api.post(`/api/admin/users/${userId}/unsuspend`, {
        reason
      });
      console.log('User unsuspended:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error unsuspending user:', error);
      if (error.response?.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
      if (error.response?.status === 404) {
        throw new Error('User not found.');
      }
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'Cannot unsuspend this user.');
      }
      throw new Error('Failed to unsuspend user. Please try again.');
    }
  },

  getUserSuspensionHistory: async (userId) => {
    try {
      console.log('Fetching suspension history for user:', userId);
      const response = await api.get(`/api/admin/users/${userId}/suspension-history`);
      console.log('Suspension history received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching suspension history:', error);
      if (error.response?.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
      if (error.response?.status === 404) {
        throw new Error('User not found.');
      }
      throw new Error('Failed to load suspension history. Please try again.');
    }
  },

  // Job management methods
  getAllJobs: async (params) => {
    try {
      console.log('Fetching admin jobs with params:', params);
      const response = await api.get('/api/admin/jobs', { params });
      console.log('Admin jobs received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching admin jobs:', error);
      if (error.response?.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
      throw new Error('Failed to load jobs. Please try again.');
    }
  },

  updateJobStatus: async (jobId, status, reason) => {
    try {
      console.log('Updating job status:', { jobId, status, reason });
      const response = await api.put(`/api/admin/jobs/${jobId}/status`, {
        status,
        reason
      });
      console.log('Job status updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating job status:', error);
      if (error.response?.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
      if (error.response?.status === 404) {
        throw new Error('Job not found.');
      }
      throw new Error('Failed to update job status. Please try again.');
    }
  },

  // Analytics and reporting methods
  getAnalytics: async (params) => {
    try {
      console.log('Fetching analytics data with params:', params);
      const response = await api.get('/api/admin/analytics', { params });
      console.log('Analytics data received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      if (error.response?.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
      throw new Error('Failed to load analytics data. Please try again.');
    }
  },

  // System settings methods
  getSystemSettings: async () => {
    try {
      console.log('Fetching system settings');
      const response = await api.get('/api/admin/settings');
      console.log('System settings received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching system settings:', error);
      if (error.response?.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
      throw new Error('Failed to load system settings. Please try again.');
    }
  },

  updateSystemSettings: async (setting, value) => {
    try {
      console.log('Updating system setting:', { setting, value });
      const response = await api.put('/api/admin/settings', {
        setting,
        value
      });
      console.log('System setting updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating system setting:', error);
      if (error.response?.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
      throw new Error('Failed to update system setting. Please try again.');
    }
  },

  // Admin activity log
  getActivityLog: async (params) => {
    try {
      console.log('Fetching admin activity log with params:', params);
      const response = await api.get('/api/admin/activity-log', { params });
      console.log('Admin activity log received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching admin activity log:', error);
      if (error.response?.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
      throw new Error('Failed to load activity log. Please try again.');
    }
  },

  verifyUser: async (userId, notes = '') => {
    try {
      console.log('Verifying user:', { userId, notes });
      const response = await api.post(`/api/admin/users/${userId}/verify`, {
        notes
      });
      console.log('User verified:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error verifying user:', error);
      if (error.response?.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
      if (error.response?.status === 404) {
        throw new Error('User not found.');
      }
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'Cannot verify this user.');
      }
      throw new Error('Failed to verify user. Please try again.');
    }
  },

  // Admin Payment Management Methods
  payments: {
    // Get all platform payments (admin only)
    getAllPlatformPayments: async (params = {}) => {
      try {
        console.log('Fetching all platform payments:', params);
        const response = await api.get('/api/admin/payments', { params });
        console.log('Platform payments received:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error fetching platform payments:', error);
        if (error.response?.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error('Failed to fetch platform payments. Please try again.');
      }
    },

    // Get platform payment statistics
    getPaymentStatistics: async (params = {}) => {
      try {
        console.log('Fetching payment statistics:', params);
        const response = await api.get('/api/admin/payments/statistics', { params });
        console.log('Payment statistics received:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error fetching payment statistics:', error);
        if (error.response?.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error('Failed to fetch payment statistics. Please try again.');
      }
    },

    // Get payment analytics/charts data
    getPaymentAnalytics: async (params = {}) => {
      try {
        console.log('Fetching payment analytics:', params);
        const response = await api.get('/api/admin/payments/analytics', { params });
        console.log('Payment analytics received:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error fetching payment analytics:', error);
        if (error.response?.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error('Failed to fetch payment analytics. Please try again.');
      }
    },

    // Get payment disputes
    getDisputes: async (params = {}) => {
      try {
        console.log('Fetching payment disputes:', params);
        const response = await api.get('/api/admin/payments/disputes', { params });
        console.log('Payment disputes received:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error fetching payment disputes:', error);
        if (error.response?.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error('Failed to fetch payment disputes. Please try again.');
      }
    },

    // Resolve payment dispute
    resolveDispute: async (disputeId, resolutionData) => {
      try {
        console.log('Resolving payment dispute:', disputeId, resolutionData);
        const response = await api.post(`/api/admin/payments/disputes/${disputeId}/resolve`, resolutionData);
        console.log('Dispute resolved:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error resolving payment dispute:', error);
        if (error.response?.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        if (error.response?.status === 404) {
          throw new Error('Dispute not found.');
        }
        throw new Error('Failed to resolve dispute. Please try again.');
      }
    },

    // Process payment refund
    processRefund: async (paymentId, refundData) => {
      try {
        console.log('Processing payment refund:', paymentId, refundData);
        const response = await api.post(`/api/admin/payments/${paymentId}/refund`, refundData);
        console.log('Refund processed:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error processing refund:', error);
        if (error.response?.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        if (error.response?.status === 404) {
          throw new Error('Payment not found.');
        }
        if (error.response?.status === 400) {
          throw new Error(error.response.data?.message || 'Cannot process refund for this payment.');
        }
        throw new Error('Failed to process refund. Please try again.');
      }
    },

    // Reverse payment transaction
    reversePayment: async (paymentId, reverseData) => {
      try {
        console.log('Reversing payment:', paymentId, reverseData);
        const response = await api.post(`/api/admin/payments/${paymentId}/reverse`, reverseData);
        console.log('Payment reversed:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error reversing payment:', error);
        if (error.response?.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        if (error.response?.status === 404) {
          throw new Error('Payment not found.');
        }
        if (error.response?.status === 400) {
          throw new Error(error.response.data?.message || 'Cannot reverse this payment.');
        }
        throw new Error('Failed to reverse payment. Please try again.');
      }
    },

    // Get platform configuration
    getPlatformConfig: async () => {
      try {
        console.log('Fetching platform payment configuration');
        const response = await api.get('/api/admin/payments/config');
        console.log('Platform config received:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error fetching platform config:', error);
        if (error.response?.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error('Failed to fetch platform configuration. Please try again.');
      }
    },

    // Update platform configuration
    updatePlatformConfig: async (configData) => {
      try {
        console.log('Updating platform payment configuration:', configData);
        const response = await api.put('/api/admin/payments/config', configData);
        console.log('Platform config updated:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error updating platform config:', error);
        if (error.response?.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        if (error.response?.status === 400) {
          throw new Error(error.response.data?.message || 'Invalid configuration data.');
        }
        throw new Error('Failed to update platform configuration. Please try again.');
      }
    },

    // Get user payment history (admin view)
    getUserPaymentHistory: async (userId, params = {}) => {
      try {
        console.log('Fetching user payment history:', userId, params);
        const response = await api.get(`/api/admin/payments/users/${userId}`, { params });
        console.log('User payment history received:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error fetching user payment history:', error);
        if (error.response?.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        if (error.response?.status === 404) {
          throw new Error('User not found.');
        }
        throw new Error('Failed to fetch user payment history. Please try again.');
      }
    },

    // Generate payment reports
    generateReport: async (reportType, params = {}) => {
      try {
        console.log('Generating payment report:', reportType, params);
        const response = await api.post('/api/admin/payments/reports', {
          type: reportType,
          ...params
        });
        console.log('Payment report generated:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error generating payment report:', error);
        if (error.response?.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error('Failed to generate payment report. Please try again.');
      }
    },

    // Get commission analytics
    getCommissionAnalytics: async (params = {}) => {
      try {
        console.log('Fetching commission analytics:', params);
        const response = await api.get('/api/admin/payments/commission-analytics', { params });
        console.log('Commission analytics received:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error fetching commission analytics:', error);
        if (error.response?.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error('Failed to fetch commission analytics. Please try again.');
      }
    },

    // Get user payment analytics (top performers and payment patterns)
    getUserPaymentAnalytics: async (params = {}) => {
      try {
        console.log('Fetching user payment analytics:', params);
        const response = await api.get('/api/admin/payments/user-analytics', { params });
        console.log('User payment analytics received:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error fetching user payment analytics:', error);
        if (error.response?.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw new Error('Failed to fetch user payment analytics. Please try again.');
      }
    },

    // Override payment status (emergency admin action)
    overridePaymentStatus: async (paymentId, statusData) => {
      try {
        console.log('Overriding payment status:', paymentId, statusData);
        const response = await api.post(`/api/admin/payments/${paymentId}/override-status`, statusData);
        console.log('Payment status overridden:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error overriding payment status:', error);
        if (error.response?.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        }
        if (error.response?.status === 404) {
          throw new Error('Payment not found.');
        }
        throw new Error('Failed to override payment status. Please try again.');
      }
    }
  }
};

// Payment API methods
export const paymentsAPI = {
  // Initiate job payment from boat owner to fisherman
  initiateJobPayment: async (paymentData) => {
    try {
      console.log('Initiating job payment:', paymentData);
      const response = await api.post('/api/payments/initiate-job-payment', paymentData);
      console.log('Payment initiated:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error initiating payment:', error);
      if (error.response?.status === 403) {
        throw new Error('Access denied. Only boat owners can initiate payments.');
      }
      if (error.response?.status === 404) {
        throw new Error('Job or application not found.');
      }
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'Invalid payment data.');
      }
      throw new Error('Failed to initiate payment. Please try again.');
    }
  },

  // Get payment status
  getPaymentStatus: async (paymentId) => {
    try {
      console.log('Fetching payment status for ID:', paymentId);
      const response = await api.get(`/api/payments/status/${paymentId}`);
      console.log('Payment status received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching payment status:', error);
      if (error.response?.status === 404) {
        throw new Error('Payment not found.');
      }
      throw new Error('Failed to fetch payment status. Please try again.');
    }
  },

  // Get payment history for user
  getPaymentHistory: async (params = {}) => {
    try {
      console.log('Fetching payment history with params:', params);
      const response = await api.get('/api/payments/history', { params });
      console.log('Payment history received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw new Error('Failed to fetch payment history. Please try again.');
    }
  },

  // Query M-Pesa transaction status
  queryTransactionStatus: async (checkoutRequestID) => {
    try {
      console.log('Querying transaction status for:', checkoutRequestID);
      const response = await api.post('/api/payments/query-status', { checkoutRequestID });
      console.log('Transaction status received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error querying transaction status:', error);
      throw new Error('Failed to query transaction status. Please try again.');
    }
  }
};

// Support API methods
export const supportAPI = {
  // Submit support ticket
  submitTicket: async (ticketData) => {
    try {
      console.log('Submitting support ticket:', ticketData);
      const response = await api.post('/api/support/ticket', ticketData);
      console.log('Support ticket submitted:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      throw new Error('Failed to submit support ticket. Please try again.');
    }
  },

  // Get user's support tickets
  getUserTickets: async (params = {}) => {
    try {
      console.log('Fetching user support tickets:', params);
      const response = await api.get('/api/support/tickets', { params });
      console.log('Support tickets received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      throw new Error('Failed to fetch support tickets. Please try again.');
    }
  },

  // Get support ticket details
  getTicketDetails: async (ticketId) => {
    try {
      console.log('Fetching support ticket details:', ticketId);
      const response = await api.get(`/api/support/tickets/${ticketId}`);
      console.log('Support ticket details received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching support ticket details:', error);
      if (error.response?.status === 404) {
        throw new Error('Support ticket not found.');
      }
      throw new Error('Failed to fetch support ticket details. Please try again.');
    }
  },

  // Update support ticket (add user comment)
  updateTicket: async (ticketId, updateData) => {
    try {
      console.log('Updating support ticket:', ticketId, updateData);
      const response = await api.put(`/api/support/tickets/${ticketId}`, updateData);
      console.log('Support ticket updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating support ticket:', error);
      if (error.response?.status === 404) {
        throw new Error('Support ticket not found.');
      }
      if (error.response?.status === 400) {
        throw new Error('Cannot update closed ticket.');
      }
      throw new Error('Failed to update support ticket. Please try again.');
    }
  }
};

export default {
  auth: authAPI,
  jobs: jobsAPI,
  applications: applicationsAPI,
  notifications: notificationsAPI,
  reviews: reviewsAPI,
  user: userAPI,
  messages: messagesAPI,
  admin: adminAPI,
  payments: paymentsAPI,
  support: supportAPI
};

// Export the base api instance for direct use
export { api };
