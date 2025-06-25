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
};

// Jobs API methods
export const jobsAPI = {  getAllJobs: async () => {
    try {
      const response = await api.get('/api/jobs');
      return response.data;
    } catch (error) {
      console.error('Get all jobs error:', error);
      throw error.response?.data || { message: error.message || 'Failed to fetch jobs' };
    }
  },  getJob: async (jobId) => {
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
  },  getMyJobs: async () => {
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
  applyForJob: async (jobId, cvFile) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Append the CV file
      formData.append('cv_file', {
        uri: cvFile.uri,
        type: cvFile.mimeType || 'application/octet-stream',
        name: cvFile.name
      });

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

  downloadCV: async (applicationId) => {
    try {
      const response = await api.get(`/api/applications/${applicationId}/download-cv`, {
        responseType: 'blob', // Important for file downloads
      });
      return response;
    } catch (error) {
      console.error('Download CV error:', error);
      throw error.response?.data || { message: error.message || 'Failed to download CV' };
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
      // Use the correct endpoint for user profile updates
      const response = await api.put('/api/users/me', userData);
      return response.data;
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
      console.log('Activity log received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching activity log:', error);
      if (error.response?.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      }
      throw new Error('Failed to load activity log. Please try again.');
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
  admin: adminAPI
};

// Export the base api instance for direct use
export { api };
