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
    const token = localStorage.getItem("authToken");
    if (!token) return null;
  
    const session = JSON.parse(token);
  
    // Check if session has expired
    if (session.expiresAt && Date.now() > session.expiresAt) {
      localStorage.removeItem("authToken"); // Clear expired session
      return null;
    }
  
    return session;
  };
  
  
  // Remove session on logout
  export const clearSession = () => {
    localStorage.removeItem("authData");
  };
  