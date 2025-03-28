import axios from "axios";

interface AuthPayload {
  userId: string;
  token: string;
  expiresAt: number;
}

// Store user authentication data
export const storeAuthData = (userId: string, token: string) => {
  const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes

  const authData: AuthPayload = {
    userId,
    token,
    expiresAt,
  };

  // Clear any existing auth data first
  clearAuthData();

  // Store new auth data
  localStorage.setItem("token", token);
  localStorage.setItem("userId", userId);
  localStorage.setItem("loggedInUserId", userId); // Store as loggedInUserId for consistent reference
  localStorage.setItem("expiresAt", expiresAt.toString());
  localStorage.setItem("isAuthenticated", "true");

  // Verify storage was successful
  const storedToken = localStorage.getItem("token");
  const storedUserId = localStorage.getItem("loggedInUserId");

  if (storedToken !== token || storedUserId !== userId) {
    console.error("Auth data storage failed - values don't match");
    return null;
  }

  console.log("Auth data stored successfully", {
    userId,
    tokenLength: token.length,
  });
  return authData;
};

// Validate that authentication data is properly stored
export const validateAuthStorage = (): boolean => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const expiresAtStr = localStorage.getItem("expiresAt");
  const isAuthStr = localStorage.getItem("isAuthenticated");

  return !!(token && userId && expiresAtStr && isAuthStr === "true");
};

// Retrieve and validate authentication data
export const getAuthData = (): AuthPayload | null => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const expiresAtStr = localStorage.getItem("expiresAt");

  if (!token || !userId || !expiresAtStr) {
    return null;
  }

  const expiresAt = parseInt(expiresAtStr, 10);

  // Check if token has expired
  if (Date.now() > expiresAt) {
    clearAuthData();
    return null;
  }

  return {
    token,
    userId,
    expiresAt,
  };
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const authData = getAuthData();
  return authData !== null;
};

// Remove auth data on logout
export const clearAuthData = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("loggedInUserId");
  localStorage.removeItem("customerId"); // Clear customerId as well
  localStorage.removeItem("lotId"); // Clear lotId as well
  localStorage.removeItem("expiresAt");
  localStorage.removeItem("isAuthenticated");
};

// Get the authentication token for API requests
export const getToken = (): string | null => {
  const authData = getAuthData();
  return authData ? authData.token : null;
};

// Extend the current session by 15 minutes
export const extendSession = async (): Promise<boolean> => {
  try {
    const authData = getAuthData();
    if (!authData) {
      return false;
    }

    // Call the token refresh endpoint
    const response = await axios.post(
      "http://localhost:8085/ParkingWithParallel/login/refresh",
      {},
      {
        headers: {
          Authorization: `Bearer ${authData.token}`,
        },
      }
    );

    // Extract token and userId from response
    const { token, userId } = response.data;

    if (!token || !userId) {
      console.error("Invalid response from refresh endpoint");
      return false;
    }

    // Store the new token data with a 30-minute expiration
    const newAuthData = storeAuthData(userId, token);
    return !!newAuthData;
  } catch (error) {
    console.error("Failed to extend session:", error);
    return false;
  }
};
