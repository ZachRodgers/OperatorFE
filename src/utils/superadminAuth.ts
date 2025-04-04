import axios from "axios";

// Define environment-specific API URL
const getBaseUrl = () => {
  return process.env.NODE_ENV === "production"
    ? "https://api.parkwithparallel.com"
    : "http://localhost:8085/ParkingWithParallel";
};

/**
 * Verifies if a superadmin token is valid
 * @param token JWT token to verify
 * @returns Promise resolving to boolean indicating if token is valid
 */
export const verifySuperadminToken = async (
  token: string
): Promise<boolean> => {
  try {
    const response = await axios.get(`${getBaseUrl()}/users/current`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Token is valid if we get a 200 response
    return response.status === 200;
  } catch (error) {
    console.error("Error verifying superadmin token:", error);
    return false;
  }
};

/**
 * Gets the superadmin token from session storage
 * @returns The token or null if not found
 */
export const getSuperadminToken = (): string | null => {
  return sessionStorage.getItem("superadminToken");
};

/**
 * Creates an axios instance with the superadmin token
 * @returns An axios instance with the superadmin token in the headers
 */
export const createSuperadminApiInstance = () => {
  const token = getSuperadminToken();

  if (!token) {
    throw new Error("No superadmin token found");
  }

  return axios.create({
    baseURL: getBaseUrl(),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
};

/**
 * Checks if the currently authenticated user has superadmin access
 * @returns Boolean indicating superadmin status
 */
export const isSuperadminAccess = (): boolean => {
  return !!getSuperadminToken();
};
