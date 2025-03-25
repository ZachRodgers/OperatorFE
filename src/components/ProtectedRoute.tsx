import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import Modal from "../components/Modal";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, loading, fetchUserData } = useUser();
  const [isSessionWarningVisible, setSessionWarningVisible] = useState(false);

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

        // If less than 2 minutes left, show warning
        if (timeLeft < 2 * 60 * 1000 && timeLeft > 0) {
          setSessionWarningVisible(true);
        }
      }
    };

    // Run the check every minute
    const interval = setInterval(checkSessionExpiration, 60 * 1000);
    return () => clearInterval(interval);
  }, [navigate, user, loading, fetchUserData]);

  // Show loading state while checking authentication
  if (loading) {
    return <div className="loading">Checking authentication...</div>;
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
        confirmText="Okay"
        cancelText="Dismiss"
        onConfirm={() => setSessionWarningVisible(false)}
        onCancel={() => setSessionWarningVisible(false)}
      />
    </>
  );
};

export default ProtectedRoute; 