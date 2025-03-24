import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import "./Login.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (isLoading) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      await api.post('/password-reset/request', email);
      setSuccess(true);
    } catch (err: any) {
      console.error("Password reset request error:", err);
      setError("An error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-container">
        <div className="login-box">
          <img src="/assets/Logo_Operator.svg" alt="Parallel Operator" className="logo-operator" />
          <div className="success-message">
            <p>If an account exists with this email, you will receive password reset instructions.</p>
            <button 
              className="login-button"
              onClick={() => navigate('/login')}
            >
              Return to Login
            </button>
          </div>
        </div>
        <footer>
          <img src="/assets/PoweredbyParallelDark.svg" alt="Powered by Parallel" className="powered-by-logo" />
        </footer>
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
            Enter your email address and we'll send you instructions to reset your password.
          </p>
          
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            name="email"
            disabled={isLoading}
            required
          />
          
          <button 
            type="submit" 
            className={`login-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
          
          {error && <p className="error">{error}</p>}
          
          <button 
            type="button"
            className="back-to-login"
            onClick={() => navigate('/login')}
          >
            Back to Login
          </button>
        </form>
      </div>
      <footer>
        <img src="/assets/PoweredbyParallelDark.svg" alt="Powered by Parallel" className="powered-by-logo" />
      </footer>
    </div>
  );
};

export default ForgotPassword; 