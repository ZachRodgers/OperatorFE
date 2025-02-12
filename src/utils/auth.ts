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
  export const getSession = (): AuthPayload | null => {
    const data = localStorage.getItem("authData");
    return data ? JSON.parse(data) : null;
  };
  
  // Remove session on logout
  export const clearSession = () => {
    localStorage.removeItem("authData");
  };
  