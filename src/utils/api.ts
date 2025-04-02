import axios from "axios";
import { getToken } from "./auth";
import { AxiosRequestConfig } from "axios";

// Define a custom interface to extend AxiosRequestConfig
interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  skipAuthRedirect?: boolean;
}

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
    // If we get a successful response, clear any server offline state
    window.dispatchEvent(
      new CustomEvent("server-status", { detail: { status: "online" } })
    );
    return response;
  },
  (error) => {
    // Check if the error is due to network connectivity (server offline)
    if (!error.response) {
      // Network error, server is likely offline
      console.error("Network error, server may be offline:", error);
      window.dispatchEvent(
        new CustomEvent("server-status", { detail: { status: "offline" } })
      );
      return Promise.reject(error);
    }

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

      // Ensure each lot has accountCreated property set from createdOn if available
      const lots = response.data.map((lot: any) => ({
        ...lot,
        accountCreated: lot.createdOn || lot.accountCreated || null,
      }));

      return lots;
    } catch (error) {
      console.error("Error fetching lots by user ID:", error);
      throw error;
    }
  },

  // Get lot by ID
  getLotById: async (lotId: string) => {
    const response = await api.get(`/parkinglots/get-by-id/${lotId}`);
    // Ensure lot has accountCreated property set from createdOn if available
    const lot = response.data;
    if (lot && lot.createdOn && !lot.accountCreated) {
      lot.accountCreated = lot.createdOn;
    }
    return lot;
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

  // Get notification recipients for a lot
  getNotificationRecipients: async (lotId: string) => {
    const response = await api.get(
      `/parkinglots/get-notification-recipients/${lotId}`
    );
    return response.data;
  },

  // Add notification recipient to a lot
  addNotificationRecipient: async (lotId: string, recipient: string) => {
    await api.post(
      `/parkinglots/add-notification-recipient/${lotId}`,
      recipient
    );
  },

  // Remove notification recipient from a lot
  removeNotificationRecipient: async (lotId: string, recipient: string) => {
    await api.delete(`/parkinglots/remove-notification-recipient/${lotId}`, {
      data: recipient,
    });
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

// Registry service functions
export const registryService = {
  // Get all registry entries for a lot
  getRegistryByLot: async (lotId: string) => {
    const response = await api.get(`/lotplateRegistry/get-by-lot/${lotId}`);
    return response.data;
  },

  // Create a new registry entry
  createRegistryEntry: async (entry: any) => {
    const response = await api.post("/lotplateRegistry/create", entry);
    return response.data;
  },

  // Update an existing registry entry
  updateRegistryEntry: async (registryId: string, entry: any) => {
    const response = await api.put(
      `/lotplateRegistry/update/${registryId}`,
      entry
    );
    return response.data;
  },

  // Delete a registry entry
  deleteRegistryEntry: async (registryId: string) => {
    await api.delete(`/lotplateRegistry/delete/${registryId}`);
  },

  // Check if a plate is registered for a lot
  isPlateRegistered: async (lotId: string, plateNumber: string) => {
    const response = await api.get(
      `/lotplateRegistry/is-registered/${lotId}/${plateNumber}`
    );
    return response.data;
  },
};

// Lot Daily Data service functions
export const lotDailyDataService = {
  // Get dashboard metrics for a lot
  getDashboardMetrics: async (
    lotId: string,
    startDate: string,
    endDate: string
  ) => {
    try {
      // If startDate and endDate are the same, use the single date endpoint
      if (startDate === endDate) {
        const response = await api.get(`/lotdaily/get-by-date/${lotId}`, {
          params: {
            date: startDate,
          },
        });
        return [response.data]; // Wrap single result in array for consistency
      }

      // Otherwise use the date range endpoint
      const response = await api.get(`/lotdaily/get-by-date-range/${lotId}`, {
        params: {
          startDate,
          endDate,
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        // Return empty array if no data exists
        return [];
      }
      console.error("Error fetching dashboard metrics:", error);
      throw error;
    }
  },
};

// Devices service functions
export const devicesService = {
  // Get all devices for a lot
  getDevicesByLot: async (lotId: string) => {
    try {
      const response = await api.get(`/devices/get-by-lot/${lotId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching devices by lot ID:", error);
      throw error;
    }
  },
};

// Password Reset service functions
export const passwordResetService = {
  // Request password reset
  requestPasswordReset: async (email: string) => {
    const response = await api.post("/password-reset/request", { email });
    return response.data;
  },

  // Reset password with token
  resetPassword: async (token: string, newPassword: string) => {
    const response = await api.post("/password-reset/reset", {
      token,
      newPassword,
    });
    return response.data;
  },
};

// Auth service functions
export const authService = {
  // ... existing auth functions ...

  // Request password reset
  requestPasswordReset: async (email: string) => {
    const response = await api.post("/password-reset/request", { email });
    return response.data;
  },

  // Reset password with token
  resetPassword: async (token: string, newPassword: string) => {
    const response = await api.post("/password-reset/reset", {
      token,
      newPassword,
    });
    return response.data;
  },
};

// Health check service
export const healthService = {
  // Simple health check to verify server connectivity
  checkServerStatus: async () => {
    try {
      // Use a simple endpoint that should always respond quickly
      const response = await api.get("/health", {
        // Don't want auto redirects for health checks
        skipAuthRedirect: true,
        // Short timeout for quick feedback
        timeout: 3000,
      } as CustomAxiosRequestConfig);
      return response.status === 200;
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  },
};

// Export the api instance for direct use
export default api;
