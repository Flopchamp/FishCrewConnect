import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';// Handle this gracefully by just rejecting with a special errorsync-storage/async-storage';

// Base URL of your API
const API_URL = 'http://192.168.197.80:3001'; // Updated to match backend port

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
    
    // Check if the request URL is for profile operations
    const isProfileOperation = error.config?.url && (
      error.config.url.includes('/api/users/me') ||
      error.config.url.includes('/profile')
    );
    
    // For profile operations, NEVER use mock data - always return the real error
    if (isProfileOperation) {
      console.log('Profile operation failed, returning real error');
      return Promise.reject(error);
    }
    
    // For other operations during development, we'll use mock data in these cases:
    // 1. Network error or timeout
    // 2. 404 errors (endpoint not found)
    // 3. 401 errors (unauthorized)
    if (error.code === 'ECONNABORTED' || 
        !error.response || 
        error.response?.status === 404 || 
        error.response?.status === 401) {
      console.log('Using mock data for development');
      // Return a custom error that api methods can check for to use mock data
      return Promise.reject({ useMockData: true, originalError: error });
    }
    
    return Promise.reject(error);
  }
);

// Helper function to generate mock user data
const getMockUser = (email, isBoatOwner) => {
  // Ensure email is a valid string
  const safeEmail = typeof email === 'string' && email !== null ? email : '';
  
  // Extract a username from the email if possible, otherwise use default
  let username = 'Test User';
  
  // Safely check if the email contains '@'
  if (safeEmail && typeof safeEmail === 'string' && safeEmail.includes('@')) {
    const parts = safeEmail.split('@');
    if (parts.length > 0 && parts[0]) {
      username = parts[0];
    }
  }
  
  // Create default user object with proper type checking
  return {
    token: 'mock-jwt-token',
    user: {
      id: 1,
      email: safeEmail,
      name: username,
      user_type: isBoatOwner === true ? 'boat_owner' : 'fisherman',
      contact_number: '555-123-4567',
      organization_name: isBoatOwner === true ? 'Sea Adventures Inc.' : null
    }
  };
};

// Fallback mock data for development when backend is unavailable
const MOCK_DATA = {
  jobs: [
    {
      job_id: 1,
      user_id: 1,
      job_title: 'Deep Sea Fishing Crew',
      description: 'Looking for experienced crew members for a 3-day deep sea fishing expedition.',
      location: 'Miami Harbor',
      payment_details: '$200 per day',
      application_deadline: '2025-07-01',
      job_duration: '3 days',
      status: 'open',
      created_at: '2025-06-01',
      updated_at: '2025-06-01'
    },
    {
      job_id: 2,
      user_id: 2,
      job_title: 'Coastal Fishing Assistant',
      description: 'Need an assistant for weekend coastal fishing trips. Experience with handling nets required.',
      location: 'San Diego Bay',
      payment_details: '$150 per trip',
      application_deadline: '2025-06-20',
      job_duration: 'Weekends',
      status: 'open',
      created_at: '2025-05-25',
      updated_at: '2025-05-25'
    }
  ]
};

// Auth API methods
export const authAPI = {
  signUp: async (userData) => {
    try {
      const response = await api.post('/api/auth/signup', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  
  signIn: async (email, password) => {
    try {
      const response = await api.post('/api/auth/signin', { email, password });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  
  // New method to refresh the token
  refreshToken: async (oldToken) => {
    try {
      // Use the old token one more time to get a fresh one
      const refreshResponse = await axios.post(
        `${API_URL}/api/auth/refresh`,
        {},
        { headers: { Authorization: `Bearer ${oldToken}` } }
      );
      
      // Return the new token and user data
      return refreshResponse.data;
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
      throw refreshError;
    }
  },
};

// Jobs API methods
export const jobsAPI = {
  getAllJobs: async () => {
    try {
      // Always try to use the real backend first
      const response = await api.get('/api/jobs');
      return response.data;
    } catch (error) {
      console.error('Get all jobs error:', error);
      
      // Only use mock data if it's a network error
      if (error.useMockData) {
        console.log('Network error - falling back to mock data');
        return MOCK_DATA.jobs;
      }
      throw error.response?.data || error.message;
    }
  },
  getJob: async (jobId) => {
    try {
      // Always try to use the real backend first
      const response = await api.get(`/api/jobs/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Get job error:', error);
      
      // Only use mock data if it's a network error
      if (error.useMockData) {
        console.log('Network error - falling back to mock data');
        const job = MOCK_DATA.jobs.find(j => j.job_id === parseInt(jobId));
        return job || null;
      }
      throw error.response?.data || error.message;
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
  },    getMyJobs: async () => {
    try {
      console.log('Fetching my jobs');
      // Always try to use the real backend first
      const response = await api.get('/api/jobs/my-jobs');
      console.log('My jobs response:', response.data);
      return response.data || [];
    } catch (error) {
      console.error('Get my jobs error:', error);
      
      // Only use mock data if it's a network error
      if (error.useMockData) {
        console.log('Network error - falling back to mock data');
        // Create a subset of mock jobs that would be owned by the current user
        const myJobs = MOCK_DATA.jobs.filter((_, index) => index % 2 === 0); // Just a simple way to get a subset
        return myJobs;
      }
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
  applyForJob: async (jobId, applicationData = { cover_letter: '' }) => {
    try {
      // Always try to use the real backend first
      const response = await api.post(`/api/applications/job/${jobId}`, applicationData);
      return response.data;
    } catch (error) {
      console.error('Apply for job error:', error);
      
      // Only use mock data if it's a network error
      if (error.useMockData) {
        console.log('Network error - falling back to mock data');
        const mockApplication = {
          id: Date.now(),
          job_id: parseInt(jobId),
          user_id: 1,
          status: 'pending',
          cover_letter: applicationData.cover_letter || '',
          application_date: new Date().toISOString(),
          job_title: MOCK_DATA.jobs.find(j => j.job_id === parseInt(jobId))?.job_title || 'Job Title'
        };
        return mockApplication;
      }
      throw error.response?.data || error.message;
    }
  },  getMyApplications: async () => {
    try {
      console.log('Fetching my applications');
      // Always try to use the real backend first
      const response = await api.get('/api/applications/my');
      console.log('My applications response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Get my applications error:', error);
      
      // Only use mock data if it's a network error
      if (error.useMockData) {
        console.log('Network error - falling back to mock data');
        return [
          {
            id: 101,
            job_id: 1,
            user_id: 1,
            status: 'pending',
            cover_letter: 'I am very interested in this position and have 5 years of experience.',
            application_date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            job_title: 'Deep Sea Fishing Crew',
            location: 'Miami Harbor'
          },
          {
            id: 102,
            job_id: 2,
            user_id: 1,
            status: 'shortlisted',
            cover_letter: 'I have worked on fishing boats for 3 years and am available immediately.',
            application_date: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
            job_title: 'Coastal Fishing Assistant',
            location: 'San Diego Bay'
          }
        ];
      }
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
export const notificationsAPI = {
  getNotifications: async () => {
    try {
      // Always try to use the real backend first
      const response = await api.get('/api/notifications');
      return response.data;
    } catch (error) {
      console.error('Get notifications error:', error);
      
      // Only use mock data if it's a network error
      if (error.useMockData) {
        console.log('Network error - falling back to mock data');
        return [
          {
            id: 1,
            user_id: 1,
            type: 'new_application',
            message: 'You have a new application for your job "Deep Sea Fishing Crew".',
            link: '/jobs/1/applications',
            is_read: false,
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            user_id: 1,
            type: 'job_status_update',
            message: 'Your job "Coastal Fishing Assistant" has been viewed by 5 people.',
            link: '/my-jobs/2',
            is_read: true,
            created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
          }
        ];
      }
      throw error.response?.data || error.message;
    }
  },
  
  markAsRead: async (notificationId) => {
    try {
      // Always try to use the real backend first
      const response = await api.put(`/api/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Mark as read error:', error);
      
      // Only use mock data if it's a network error
      if (error.useMockData) {
        console.log('Network error - falling back to mock data');
        return { message: 'Notification marked as read.' };
      }
      throw error.response?.data || error.message;
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
      
      // Fall back to mock data for 404 errors or network errors during development
      if (error.useMockData || error.response?.status === 404) {
        console.log('Using mock profile data');
        return {
          user_id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          profile_image: null, // null to test default image
          user_type: 'fisherman',
          location: 'San Francisco Bay Area',
          years_experience: 5,
          bio: 'Experienced fisherman with expertise in deep sea fishing and coastal waters.',
          specialties: ['Tuna', 'Grouper', 'Snapper'],
          skills: ['Navigation', 'Equipment Maintenance', 'First Aid'],
          available: true,
          contact_number: '555-123-4567',
          rating: 4.7
        };
      }
      throw error.response?.data || error.message;
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
      // Always try to use the real backend first
      const response = await api.get(`/api/users/${userId}/reviews`);
      return response.data;
    } catch (error) {
      console.error('Get user reviews error:', error);
      
      // Fall back to mock data for 404 errors or network errors during development
      if (error.useMockData || error.response?.status === 404) {
        console.log('Using mock reviews data');
        return [
          {
            id: 1,
            reviewer_id: 2,
            reviewer_name: 'Captain Mike',
            reviewer_image: null,
            rating: 5,
            comment: 'John was an excellent crew member. Knowledgeable, hardworking, and reliable.',
            created_at: new Date(Date.now() - 1728000000).toISOString(), // 20 days ago
            job_title: 'Deep Sea Fishing Expedition'
          },
          {
            id: 2,
            reviewer_id: 3,
            reviewer_name: 'Sarah Johnson',
            reviewer_image: null,
            rating: 4,
            comment: 'Good skills and work ethic. Would hire again for my fishing charters.',
            created_at: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
            job_title: 'Coastal Fishing Trip'
          }
        ];
      }
      throw error.response?.data || error.message;
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
    
    // Fall back to mock data for 404 errors or network errors during development
    if (error.useMockData || error.response?.status === 404) {
      console.log('Using mock job owner data');
      return {
        user_id: userId,
        name: 'Boat Owner',
        email: 'owner@example.com',
        profile_image: null,
        user_type: 'boat_owner',
        location: 'San Francisco Bay Area',
        company_name: 'SF Fishing Charters',
        rating: 4.5
      };
    }
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
    
    // Fall back to mock data for 404 errors or network errors during development
    if (error.useMockData || error.response?.status === 404) {
      console.log('Using mock reviews data');
      return [
        {
          id: 1,
          reviewer_id: 3,
          reviewer_name: 'John Fisher',
          reviewer_image: null,
          rating: 4,
          comment: 'Great boat owner to work with. Clear instructions and fair pay.',
          created_at: new Date(Date.now() - 1728000000).toISOString(), // 20 days ago
          job_title: 'Weekend Fishing Charter'
        },
        {
          id: 2,
          reviewer_id: 4,
          reviewer_name: 'Maria Rodriguez',
          reviewer_image: null,
          rating: 5,
          comment: 'Excellent experience. The boat was well maintained and the job was as described.',
          created_at: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
          job_title: 'Deep Sea Fishing Trip'
        }
      ];
    }
    throw error.response?.data || error.message;
  }
};

// Messages API methods
export const messagesAPI = {
  getConversations: async () => {
    try {
      const response = await api.get('/api/messages/conversations');
      return response.data;
    } catch (error) {
      console.error('Get conversations error:', error);
      throw error.response?.data || error.message;
    }
  },
    getMessages: async (otherUserId) => {
    try {
      const response = await api.get(`/api/messages/${otherUserId}`);
      return response.data;
    } catch (error) {
      console.error('Get messages error:', error);
      throw error.response?.data || error.message;
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

export default {
  auth: authAPI,
  jobs: jobsAPI,
  applications: applicationsAPI,
  notifications: notificationsAPI,
  reviews: reviewsAPI,
  user: userAPI,
  messages: messagesAPI
};
