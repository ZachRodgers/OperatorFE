import axios from "axios";
import { getToken } from "./auth";

// Create an Axios instance with default config
const api = axios.create({
  baseURL: "http://localhost:8085/ParkingWithParallel",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to inject the auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
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
        if (fullUrl !== "/login") {
          window.location.href = "/login";
        }
      } catch (err) {
        // Fallback redirection in case URL construction fails
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// User service functions
export const userService = {
  // Get current user details
  getCurrentUser: async () => {
    const response = await api.get("/users/current");
    return response.data;
  },

  // Get user by ID
  getUserById: async (userId: string) => {
    const response = await api.get(`/users/get-user-by-id/${userId}`);
    return response.data;
  },
};

// Lot service functions
export const lotService = {
  // Get all lots
  getAllLots: async () => {
    const response = await api.get("/parkinglots/get-all");
    return response.data;
  },

  // Get lots by user ID (lots where user is owner/operator/staff)
  getLotsByUserId: async (userId: string) => {
    try {
      // Use the new dedicated endpoint
      const response = await api.get(`/parkinglots/get-by-user/${userId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching lots by user ID:", error);
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
  },

  // Enable registry for a lot
  enableRegistry: async (lotId: string) => {
    const response = await api.post(`/parkinglots/enable-registry/${lotId}`);
    return response.data;
  },

  // Disable registry for a lot
  disableRegistry: async (lotId: string) => {
    const response = await api.post(`/parkinglots/disable-registry/${lotId}`);
    return response.data;
  },

  // Get registry status for a lot
  getRegistryStatus: async (lotId: string) => {
    const response = await api.get(`/parkinglots/get-registry-status/${lotId}`);
    return response.data;
  },
};

// Lot Pricing service functions
export const lotPricingService = {
  // Get latest pricing for a lot
  getLatestPricingByLotId: async (lotId: string) => {
    try {
      const response = await api.get(
        `/lotpricing/get-latest-pricing-by-lot-id/${lotId}`
      );
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        // Return null if no pricing exists for this lot
        return null;
      }
      console.error("Error fetching lot pricing:", error);
      throw error;
    }
  },

  // Get all pricing records for a lot
  getAllPricingsByLotId: async (lotId: string) => {
    try {
      const response = await api.get(
        `/lotpricing/get-general-pricing-by-lot-id/${lotId}`
      );
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        // Return empty array if no pricing exists for this lot
        return [];
      }
      console.error("Error fetching lot pricings:", error);
      throw error;
    }
  },

  // Update or create pricing for a lot
  updateOrCreatePricing: async (lotId: string, pricingData: any) => {
    try {
      const response = await api.put(
        `/lotpricing/update-or-create-pricing-by-lot-id/${lotId}`,
        pricingData
      );
      return response.data;
    } catch (error: any) {
      console.error("Error updating lot pricing:", error);
      throw error;
    }
  },

  // Get advanced pricing for a lot
  getAdvancedPricingByLotId: async (lotId: string) => {
    try {
      const response = await api.get(
        `/lotadvancedpricing/get-advanced-pricing-by-lot-id/${lotId}`
      );
      return response.data;
    } catch (error: any) {
      // Return empty array if 404 (no pricing found)
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  },

  // Update all advanced pricing for a lot (replaces existing entries)
  updateAdvancedPricing: async (lotId: string, pricingData: any[]) => {
    const response = await api.put(
      `/lotadvancedpricing/update-lot-advanced-pricing/${lotId}`,
      pricingData
    );
    return response.data;
  },

  // Delete all advanced pricing for a lot
  deleteAllAdvancedPricing: async (lotId: string) => {
    await api.delete(`/lotadvancedpricing/delete-all-by-lot-id/${lotId}`);
  },

  // New methods for advanced settings state
  getAdvancedSettingsState: async (lotId: string) => {
    try {
      const response = await api.get(
        `/lotadvancedpricing/advanced-settings-state/${lotId}`
      );
      return response.data.enabled;
    } catch (error) {
      // Default to false if error
      console.error("Error getting advanced settings state:", error);
      return false;
    }
  },

  setAdvancedSettingsState: async (lotId: string, enabled: boolean) => {
    const response = await api.put(
      `/lotadvancedpricing/advanced-settings-state/${lotId}`,
      { enabled }
    );
    return response.data.enabled;
  },
};

// Session service functions
export const sessionService = {
  // Get all sessions
  getAllSessions: async () => {
    const response = await api.get("/parkinglots/sessions/get-all");
    return response.data;
  },

  // Get session by ID
  getSessionById: async (sessionId: string) => {
    const response = await api.get(
      `/parkinglots/sessions/get-by-id/${sessionId}`
    );
    return response.data;
  },

  // Get sessions by lot ID
  getSessionsByLot: async (lotId: string) => {
    const response = await api.get(`/parkinglots/sessions/get-by-lot/${lotId}`);
    return response.data;
  },

  // Create new session
  createSession: async (sessionData: any) => {
    const response = await api.post(
      `/parkinglots/sessions/create`,
      sessionData
    );
    return response.data;
  },

  // Update session
  updateSession: async (sessionId: string, sessionData: any) => {
    const response = await api.put(
      `/parkinglots/sessions/update/${sessionId}`,
      sessionData
    );
    return response.data;
  },

  // Validate session
  validateSession: async (
    sessionId: string,
    validated: boolean,
    modifiedBy: string
  ) => {
    const response = await api.put(
      `/parkinglots/sessions/validate/${sessionId}?validated=${validated}&modifiedBy=${modifiedBy}`
    );
    return response.data;
  },

  // End session
  endSession: async (
    sessionId: string,
    exitDeviceId: string,
    modifiedBy: string
  ) => {
    console.log(`Calling end session API for session ${sessionId}`);
    const response = await api.put(
      `/parkinglots/sessions/end/${sessionId}`,
      null,
      {
        params: {
          exitDeviceId: exitDeviceId,
          modifiedBy: modifiedBy,
        },
      }
    );
    return response.data;
  },

  // Delete session
  deleteSession: async (sessionId: string) => {
    console.log(`Deleting session with ID: ${sessionId}`);
    await api.delete(`/parkinglots/sessions/delete/${sessionId}`);
  },
};

export default api;
