interface AuthPayload {
    customerId: string;
    role: string;
    assignedLots: string[];
  }
  
  // Store user session (simulating JWT)
  export const storeSession = (payload: AuthPayload) => {
    localStorage.setItem("authData", JSON.stringify(payload));
  };
  
  // Retrieve session
  export const getSession = () => {
    const session = localStorage.getItem("authToken");
  
    if (!session) return null;
  
    const userData = JSON.parse(session);
  
    // If the session is expired, remove it and return null
    if (Date.now() > userData.expiresAt) {
      localStorage.removeItem("authToken");
      return null;
    }
  
    return userData;
  };
  
  
  
  // Remove session on logout
  export const clearSession = () => {
    localStorage.removeItem("authData");
  };
  