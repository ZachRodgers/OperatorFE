import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { storeAuthData, validateAuthStorage, isAuthenticated } from "../utils/auth";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const navigate = useNavigate();

  // Check if already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      console.log("User already authenticated, redirecting to dashboard");
      window.location.href = "/dashboard";
    }
  }, []);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Prevent multiple submissions
    if (isLoading || isRedirecting) return;

    setIsLoading(true);
    setError("");

    try {
      console.log("Attempting login for:", email);

      // This calls our Spring Boot /login endpoint
      const response = await api.post('/login', {
        email: email,
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

      if (err.response) {
        if (err.response.status === 401) {
          errorMessage = "Incorrect email or password";
        } else if (err.response.data) {
          errorMessage = err.response.data;
        }
      } else if (err.request) {
        errorMessage = "Server not responding. Please try again later.";
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
  );
};

export default Login;
