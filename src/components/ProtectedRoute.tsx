import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import Modal from "../components/Modal";
import LoadingWheel from "./LoadingWheel";
import { extendSession } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, loading, fetchUserData } = useUser();
  const [isSessionWarningVisible, setSessionWarningVisible] = useState(false);
  const [isExtendingSession, setIsExtendingSession] = useState(false);

  useEffect(() => {
    // Fetch user data if not already loaded
    if (!user && !loading) {
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
  }, [navigate, user, loading, fetchUserData]);

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

  // Show loading state while checking authentication
  if (loading) {
    return <LoadingWheel text="Checking authentication..." />;
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