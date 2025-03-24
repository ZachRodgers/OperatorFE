import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../utils/api";
import "./Login.css";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setError("Invalid reset link");
        setIsValidating(false);
        return;
      }

      try {
        // You might want to add a token validation endpoint
        setIsValid(true);
      } catch (err) {
        setError("Invalid or expired reset link");
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (isLoading) return;
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const token = searchParams.get("token");
      await api.post(`/password-reset/reset?token=${token}`, password);
      navigate("/login", { state: { message: "Password has been reset successfully. Please login with your new password." } });
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(err.response?.data || "An error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="login-container">
        <div className="login-box">
          <img src="/assets/Logo_Operator.svg" alt="Parallel Operator" className="logo-operator" />
          <div className="loading-message">
            <div className="spinner"></div>
            <p>Validating reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="login-container">
        <div className="login-box">
          <img src="/assets/Logo_Operator.svg" alt="Parallel Operator" className="logo-operator" />
          <div className="error-message">
            <p>{error}</p>
            <button 
              className="login-button"
              onClick={() => navigate('/login')}
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <img src="/assets/Logo_Operator.svg" alt="Parallel Operator" className="logo-operator" />
        
        <form onSubmit={handleSubmit}>
          <h2>Reset Password</h2>
          <p className="reset-instructions">
            Please enter your new password below.
          </p>
          
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            name="password"
            disabled={isLoading}
            required
          />
          
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            name="confirmPassword"
            disabled={isLoading}
            required
          />
          
          <button 
            type="submit" 
            className={`login-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>
          
          {error && <p className="error">{error}</p>}
        </form>
      </div>
      <footer>
        <img src="/assets/PoweredbyParallelDark.svg" alt="Powered by Parallel" className="powered-by-logo" />
      </footer>
    </div>
  );
};

export default ResetPassword; 