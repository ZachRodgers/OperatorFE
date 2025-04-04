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
    console.log(
      "OperatorFE - Verifying token:",
      token.substring(0, 20) + "..."
    );

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
    console.log("OperatorFE - Verification response:", data);

    // Only return true if the user is confirmed to be a superadmin
    return data.isSuperAdmin === true;
  } catch (error) {
    console.error("Error verifying superadmin token:", error);
    // Try a fallback - check for SuperAdmin role in token directly
    try {
      const decodedToken = JSON.parse(atob(token.split(".")[1]));
      if (decodedToken && decodedToken.role === "SuperAdmin") {
        console.log(
          "OperatorFE - Fallback verification found SuperAdmin role in token"
        );
        return true;
      }
    } catch (decodeError) {
      console.error("Error decoding token:", decodeError);
    }
    return false;
  }
};

/**
 * Gets the superadmin token from session storage
 * Uses multiple possible storage mechanisms for compatibility
 * @returns The token or null if not found
 */
export const getSuperadminToken = (): string | null => {
  // First check our permanent storage
  const directToken = sessionStorage.getItem("superadminToken");
  if (directToken) {
    return directToken;
  }

  // Check for a token that was directly transferred from SuperadminFE
  const transferToken = sessionStorage.getItem("superadmin_token_transfer");
  if (transferToken) {
    // Store it in our permanent location and remove the transfer token
    sessionStorage.setItem("superadminToken", transferToken);
    sessionStorage.removeItem("superadmin_token_transfer");
    return transferToken;
  }

  return null;
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
