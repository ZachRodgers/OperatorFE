import axios from "axios";

// Define environment-specific API URL
const getBaseUrl = () => {
  return process.env.NODE_ENV === "production"
    ? "https://api.parkwithparallel.com"
    : "http://localhost:8085/ParkingWithParallel";
};

interface SuperadminVerificationResponse {
  isSuperAdmin: boolean;
  userId: string;
  role: string;
}

/**
 * Verifies if a token belongs to a superadmin user
 * @param token JWT token to verify
 * @returns Promise resolving to boolean indicating if token is valid and belongs to a superadmin
 */
export const verifySuperadminToken = async (
  token: string
): Promise<boolean> => {
  try {
    // Use the dedicated endpoint for superadmin verification
    const response = await axios.post(
      `${getBaseUrl()}/login/verify-superadmin`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Parse the response
    const data = response.data as SuperadminVerificationResponse;

    // Only return true if the user is confirmed to be a superadmin
    return data.isSuperAdmin === true;
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
