import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { Lot } from '../types';

// Component to show when user has no lots
const NoLotsMessage = () => (
  <div className="no-lots-message">
    <style>
      {`
        .no-lots-message {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          text-align: center;
          padding: 20px;
          background-color: #f7f9fc;
        }
        
        .no-lots-message h1 {
          color: #333;
          margin-bottom: 20px;
          font-size: 28px;
        }
        
        .no-lots-message p {
          color: #666;
          margin-bottom: 15px;
          max-width: 500px;
          line-height: 1.5;
        }
        
        .login-button {
          background-color: #007AFF;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
          margin-top: 20px;
          transition: background-color 0.2s;
        }
        
        .login-button:hover {
          background-color: #0056b3;
        }
      `}
    </style>
    <h1>No Lots Available</h1>
    <p>You don't have any lots assigned to your account.</p>
    <p>Please contact your administrator if you believe this is an error.</p>
    <button 
      onClick={() => window.location.href = "/login"}
      className="login-button"
    >
      Back to Login
    </button>
  </div>
);

const UserRedirect: React.FC = () => {
  const { fetchUserData, fetchUserLots, user, userLots, loading, error } = useUser();
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [noLots, setNoLots] = useState<boolean>(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Fetch user data if not already loaded
        if (!user) {
          await fetchUserData();
        }
        
        // Fetch user lots if not already loaded
        if (userLots.length === 0) {
          const lots = await fetchUserLots();
          
          // After fetching, check the lots to determine redirect
          if (lots.length > 1) {
            // If user has multiple lots, redirect to owner dashboard
            setRedirectPath('/owner-dashboard');
          } else if (lots.length === 1) {
            // If user has only one lot, redirect directly to that lot's dashboard
            setRedirectPath(`/lot/${lots[0].lotId}/revenue-dashboard`);
          } else {
            // No lots found
            setNoLots(true);
          }
        } else {
          // Use existing lots data to determine redirect
          if (userLots.length > 1) {
            setRedirectPath('/owner-dashboard');
          } else if (userLots.length === 1) {
            setRedirectPath(`/lot/${userLots[0].lotId}/revenue-dashboard`);
          } else {
            setNoLots(true);
          }
        }
      } catch (err) {
        console.error('Error in UserRedirect:', err);
      }
    };

    loadUserData();
  }, [fetchUserData, fetchUserLots, user, userLots]);

  if (loading) {
    return <div className="loading">Loading user data...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (noLots) {
    return <NoLotsMessage />;
  }

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  // This fallback shouldn't normally be visible as we handle all cases above
  return <div className="loading">Determining where to redirect you...</div>;
};

export default UserRedirect; 