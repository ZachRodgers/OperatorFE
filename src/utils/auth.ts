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
    expiresAt
  };
  
  localStorage.setItem("token", token);
  localStorage.setItem("userId", userId);
  localStorage.setItem("expiresAt", expiresAt.toString());
  localStorage.setItem("isAuthenticated", "true");

  return authData;
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
    expiresAt
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
  localStorage.removeItem("expiresAt");
  localStorage.removeItem("isAuthenticated");
};

// Get the authentication token for API requests
export const getToken = (): string | null => {
  const authData = getAuthData();
  return authData ? authData.token : null;
};
  