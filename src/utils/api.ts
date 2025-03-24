import axios from 'axios';
import { getToken } from './auth';

// Create an Axios instance with default config
const api = axios.create({
  baseURL: 'http://localhost:8085/ParkingWithParallel',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to inject the auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common error cases
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized - redirect to login for protected endpoints
    if (error.response && error.response.status === 401) {
      try {
        const baseURL = error.config.baseURL || window.location.origin;
        const fullUrl = new URL(error.config.url, baseURL).pathname;
        // If the request was NOT made to the login endpoint, then redirect
        if (fullUrl !== '/login') {
          window.location.href = '/login';
        }
      } catch (err) {
        // Fallback redirection in case URL construction fails
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// User service functions
export const userService = {
  // Get current user details
  getCurrentUser: async () => {
    const response = await api.get('/users/current');
    return response.data;
  },
  
  // Get user by ID
  getUserById: async (userId: string) => {
    const response = await api.get(`/users/get-user-by-id/${userId}`);
    return response.data;
  }
};

// Lot service functions
export const lotService = {
  // Get all lots
  getAllLots: async () => {
    const response = await api.get('/parkinglots/get-all');
    return response.data;
  },
  
  // Get lots by user ID (lots where user is owner/operator/staff)
  getLotsByUserId: async (userId: string) => {
    try {
      // Use the new dedicated endpoint
      const response = await api.get(`/parkinglots/get-by-user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching lots by user ID:', error);
      throw error;
    }
  },
  
  // Get lot by ID
  getLotById: async (lotId: string) => {
    const response = await api.get(`/parkinglots/get-by-id/${lotId}`);
    return response.data;
  },

  // Update lot
  updateLot: async (lotId: string, lotData: any) => {
    const response = await api.put(`/parkinglots/update/${lotId}`, lotData);
    return response.data;
  }
};

export default api; 