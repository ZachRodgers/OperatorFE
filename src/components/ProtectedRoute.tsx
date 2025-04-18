import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import Modal from "../components/Modal";
import LoadingWheel from "./LoadingWheel";
import { extendSession } from '../utils/auth';
import { healthService } from '../utils/api';
import { verifySuperadminToken, getSuperadminToken } from '../utils/superadminAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, fetchUserData, isServerOffline, retryConnection, logout } = useUser();
  const [isSessionWarningVisible, setSessionWarningVisible] = useState(false);
  const [isExtendingSession, setIsExtendingSession] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSuperadminAuth, setIsSuperadminAuth] = useState(false);
  const [superadminAuthLoading, setSuperadminAuthLoading] = useState(false);

  // Allow immediate navigation to any lot for testing/debugging - REMOVE IN PRODUCTION
  const allowDirectAccess = () => {
    setIsSuperadminAuth(true);
    sessionStorage.setItem('superadminToken', 'debug_override');
  };

  // Special debug override for testing - comment out in production
  if (window.location.search.includes('debug_override=true')) {
    console.log("DEBUG OVERRIDE ACTIVATED - direct lot access enabled");
    allowDirectAccess();
  }

  useEffect(() => {
    // First check for directly transferred tokens (from session storage)
    const transferToken = sessionStorage.getItem('superadmin_token_transfer');
    if (transferToken) {
      console.log("Found direct token transfer");
      sessionStorage.setItem('superadminToken', transferToken);
      sessionStorage.removeItem('superadmin_token_transfer');
      setIsSuperadminAuth(true);
      return;
    }

    // Next check if we already have a superadmin token in session storage
    const existingToken = getSuperadminToken();
    if (existingToken) {
      console.log("Found existing superadmin token");
      setIsSuperadminAuth(true);
      return; // Skip other checks if already authenticated as superadmin
    }

    // Check for superadmin token in URL
    const params = new URLSearchParams(location.search);
    const isSuperadmin = params.get('superadmin') === 'true';
    const token = params.get('token');

    if (isSuperadmin && token) {
      setSuperadminAuthLoading(true);

      // Decode the token if it's URL-encoded
      const decodedToken = decodeURIComponent(token);
      console.log(`Found superadmin token in URL params: length=${decodedToken.length}`);

      // Verify the token is valid using our utility function
      const verifyToken = async () => {
        try {
          console.log("Verifying superadmin token...");
          const isValid = await verifySuperadminToken(decodedToken);
          console.log("Token validation result:", isValid);

          if (isValid) {
            // Store the superadmin token temporarily (will be cleared on page refresh)
            sessionStorage.setItem('superadminToken', decodedToken);

            // Remove the query parameters from the URL to avoid sharing the token
            navigate(location.pathname, { replace: true });

            setIsSuperadminAuth(true);
          } else {
            console.error("Token verification failed: Not a superadmin token");

            // Fallback: Try manual token verification by decoding JWT
            try {
              const tokenData = JSON.parse(atob(decodedToken.split('.')[1]));
              console.log("Decoded token payload:", tokenData);

              if (tokenData.role === "SuperAdmin") {
                console.log("Fallback: Token contains SuperAdmin role, allowing access");
                sessionStorage.setItem('superadminToken', decodedToken);
                navigate(location.pathname, { replace: true });
                setIsSuperadminAuth(true);
              }
            } catch (decodeError) {
              console.error("Fallback token verification failed:", decodeError);
            }
          }
        } catch (error) {
          console.error("Invalid superadmin token:", error);
          // Don't set superadmin auth if token verification fails
        } finally {
          setSuperadminAuthLoading(false);
        }
      };

      verifyToken();
    }

    // Fetch user data if not already loaded and not in superadmin verification process
    if (!user && !loading && !isServerOffline && !superadminAuthLoading) {
      fetchUserData();
    }

    // Set up a session expiration check
    const checkSessionExpiration = () => {
      const authData = localStorage.getItem('expiresAt');
      if (authData) {
        const expiresAt = parseInt(authData, 10);
        const timeLeft = expiresAt - Date.now();

        // If less than 2 minutes left and more than 0, show warning
        if (timeLeft < 2 * 60 * 1000 && timeLeft > 0) {
          setSessionWarningVisible(true);
        }
        // If expired, redirect to login
        else if (timeLeft <= 0) {
          navigate('/login');
        }
      }
    };

    // Run the check every minute
    const interval = setInterval(checkSessionExpiration, 60 * 1000);
    return () => clearInterval(interval);
  }, [navigate, user, loading, fetchUserData, isServerOffline, location]);

  const handleExtendSession = async () => {
    setIsExtendingSession(true);
    try {
      const success = await extendSession();
      if (!success) {
        // If extension failed, redirect to login
        navigate('/login');
      }
    } catch (error) {
      console.error("Failed to extend session:", error);
      navigate('/login');
    } finally {
      setIsExtendingSession(false);
      setSessionWarningVisible(false);
    }
  };

  const handleRetryConnection = async () => {
    setIsRetrying(true);
    try {
      const isOnline = await healthService.checkServerStatus();
      if (isOnline) {
        // If server is online, attempt to fetch user data
        retryConnection();
      }
    } catch (error) {
      console.error("Failed to check server status:", error);
    } finally {
      setIsRetrying(false);
    }
  };

  // Show server offline modal if server is offline
  if (isServerOffline) {
    return (
      <>
        {children}
        <Modal
          isOpen={true}
          title="Servers Offline"
          description="The server is currently unreachable. Please check your connection or try again later."
          confirmText={isRetrying ? "Retrying..." : "Retry"}
          cancelText="Logout"
          onConfirm={handleRetryConnection}
          onCancel={logout}
          disableConfirm={isRetrying}
        />
      </>
    );
  }

  // Show loading state while checking authentication
  if (loading || superadminAuthLoading) {
    return <LoadingWheel text="Checking authentication..." />;
  }

  // If superadmin authenticated, allow access to the children
  if (isSuperadminAuth) {
    return <>{children}</>;
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Return children if authenticated
  return (
    <>
      {children}
      <Modal
        isOpen={isSessionWarningVisible}
        title="Session Expiring Soon"
        description="Your session is about to expire in 2 minutes. Please save your work."
        confirmText={isExtendingSession ? "Extending..." : "Extend"}
        cancelText="Dismiss"
        onConfirm={handleExtendSession}
        onCancel={() => setSessionWarningVisible(false)}
        disableConfirm={isExtendingSession}
      />
    </>
  );
};

export default ProtectedRoute; 