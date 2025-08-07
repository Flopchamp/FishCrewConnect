import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/api/auth/signin', { email, password });
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/api/users/me');
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  // Dashboard
  getDashboardStats: async () => {
    const response = await api.get('/api/admin/dashboard/stats');
    return response.data;
  },
  
  // Users
  getAllUsers: async (params) => {
    const response = await api.get('/api/admin/users', { params });
    return response.data;
  },
  
  getUserById: async (userId) => {
    const response = await api.get(`/api/admin/users/${userId}`);
    return response.data;
  },
  
  verifyUser: async (userId, notes) => {
    const response = await api.post(`/api/admin/users/${userId}/verify`, { notes });
    return response.data;
  },
  
  suspendUser: async (userId, reason) => {
    const response = await api.post(`/api/admin/users/${userId}/suspend`, { reason });
    return response.data;
  },
  
  unsuspendUser: async (userId, reason) => {
    const response = await api.post(`/api/admin/users/${userId}/unsuspend`, { reason });
    return response.data;
  },
  
  updateUserStatus: async (userId, action, reason) => {
    const response = await api.put(`/api/admin/users/${userId}/status`, { action, reason });
    return response.data;
  },
  
  // Jobs
  getAllJobs: async (params) => {
    const response = await api.get('/api/admin/jobs', { params });
    return response.data;
  },
  
  updateJobStatus: async (jobId, status, reason) => {
    const response = await api.put(`/api/admin/jobs/${jobId}/status`, { status, reason });
    return response.data;
  },
  
  // Payments
  getAllPlatformPayments: async (params) => {
    const response = await api.get('/api/admin/payments', { params });
    return response.data;
  },
  
  getPaymentStatistics: async (params) => {
    const response = await api.get('/api/admin/payments/statistics', { params });
    return response.data;
  },
  
  getPaymentAnalytics: async (params) => {
    const response = await api.get('/api/admin/payments/analytics', { params });
    return response.data;
  },
  
  getCommissionAnalytics: async (params) => {
    const response = await api.get('/api/admin/payments/commission-analytics', { params });
    return response.data;
  },
  
  processRefund: async (paymentId, refundData) => {
    const response = await api.post(`/api/admin/payments/${paymentId}/refund`, refundData);
    return response.data;
  },
  
  reversePayment: async (paymentId, reverseData) => {
    const response = await api.post(`/api/admin/payments/${paymentId}/reverse`, reverseData);
    return response.data;
  },
  
  // Analytics
  getAnalytics: async (params) => {
    const response = await api.get('/api/admin/analytics', { params });
    return response.data;
  },
  
  getPaymentAnalytics: async (params) => {
    const response = await api.get('/api/admin/payments/analytics', { params });
    return response.data;
  },
  
  getCommissionAnalytics: async (params) => {
    const response = await api.get('/api/admin/payments/commission-analytics', { params });
    return response.data;
  },
  
  // Settings
  getSystemSettings: async () => {
    const response = await api.get('/api/admin/settings');
    return response.data;
  },
  
  updateSystemSettings: async (setting, value) => {
    const response = await api.put('/api/admin/settings', { setting, value });
    return response.data;
  },
  
  // Activity Log
  getActivityLog: async (params) => {
    const response = await api.get('/api/admin/activity-log', { params });
    return response.data;
  },
};

export default api;
