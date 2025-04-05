import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { healthService } from "../utils/api";
import { storeAuthData, validateAuthStorage, isAuthenticated } from "../utils/auth";
import Modal from "../components/Modal";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isServerOffline, setIsServerOffline] = useState(false);
  const navigate = useNavigate();

  // Listen for server status events
  useEffect(() => {
    const handleServerStatus = (event: any) => {
      if (event.detail.status === 'offline') {
        setIsServerOffline(true);
      } else if (event.detail.status === 'online') {
        setIsServerOffline(false);
      }
    };

    window.addEventListener('server-status', handleServerStatus);
    return () => {
      window.removeEventListener('server-status', handleServerStatus);
    };
  }, []);

  // Check if already logged in
  useEffect(() => {
    if (isAuthenticated() && !isServerOffline) {
      console.log("User already authenticated, redirecting to dashboard");
      window.location.href = "/dashboard";
    }
  }, [isServerOffline]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Prevent multiple submissions
    if (isLoading || isRedirecting) return;

    setIsLoading(true);
    setError("");

    try {
      // Convert email to lowercase for case-insensitive comparison
      const emailLowercase = email.toLowerCase();
      console.log("Attempting login for:", emailLowercase);

      // This calls our Spring Boot /login endpoint
      const response = await api.post('/login', {
        email: emailLowercase,
        password: password
      }, { skipAuthRedirect: true } as any);

      console.log("Login response received:", response.status);

      // Extract token and userId from response
      const { token, userId } = response.data;

      if (!token || !userId) {
        throw new Error("Invalid response: missing token or userId");
      }

      // Store authentication data with 30-minute expiration
      const authData = storeAuthData(userId, token);

      if (!authData) {
        throw new Error("Failed to store authentication data");
      }

      // Verify the auth data was properly stored
      const isValid = validateAuthStorage();

      if (!isValid) {
        throw new Error("Auth validation failed after storage");
      }

      console.log("Auth storage validated, preparing to navigate");
      setIsRedirecting(true);

      // Use window.location for a full page reload instead of React Router navigation
      // This ensures a clean state and properly initialized auth context
      setTimeout(() => {
        console.log("Performing hard redirect to dashboard...");
        window.location.href = "/dashboard";
      }, 500);

    } catch (err: any) {
      console.error("Login error:", err);
      let errorMessage = "Invalid credentials";

      if (!err.response) {
        // Network error - server is likely offline
        setIsServerOffline(true);
        errorMessage = "Server not responding. Please try again later.";
      } else if (err.response) {
        if (err.response.status === 401) {
          errorMessage = "Incorrect email or password";
        } else if (err.response.data) {
          errorMessage = err.response.data;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/forgot-password');
  };

  const handleRetryConnection = () => {
    // Try to check if server is back online using the health service
    healthService.checkServerStatus()
      .then(isOnline => {
        if (isOnline) {
          setIsServerOffline(false);
          // If previously authenticated, redirect to dashboard
          if (isAuthenticated()) {
            window.location.href = "/dashboard";
          }
        } else {
          // Server still offline
          setIsServerOffline(true);
        }
      })
      .catch(() => {
        // Server still offline
        setIsServerOffline(true);
      });
  };

  if (isRedirecting) {
    return (
      <div className="login-container">
        <div className="login-box">
          <img src="/assets/Logo_Operator.svg" alt="Parallel Operator" className="logo-operator" />
          <div className="redirecting-message">
            <div className="spinner"></div>
            <p>Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="login-container">
        <div className="login-box">
          <img src="/assets/Logo_Operator.svg" alt="Parallel Operator" className="logo-operator" />

          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              name="email"
              disabled={isLoading}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              name="password"
              disabled={isLoading}
            />
            <button
              type="submit"
              className={`login-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
            {error && <p className="error">{error}</p>}
          </form>

          <a href="#" className="forgot-password" onClick={handleForgotPassword}>Forgot my password</a>
        </div>
        <footer>
          <img src="/assets/PoweredbyParallelDark.svg" alt="Powered by Parallel" className="powered-by-logo" />
        </footer>
      </div>

      {/* Server Offline Modal */}
      <Modal
        isOpen={isServerOffline}
        title="Servers Offline"
        description="The server is currently unreachable. Please check your connection or try again later."
        confirmText="Retry"
        cancelText="Dismiss"
        onConfirm={handleRetryConnection}
        onCancel={() => setIsServerOffline(false)}
      />
    </>
  );
};

export default Login;
