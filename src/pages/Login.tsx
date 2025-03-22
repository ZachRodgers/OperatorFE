import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { storeAuthData } from "../utils/auth";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    
    try {
      // This calls our Spring Boot /login endpoint
      const response = await api.post('/login', {
        email: email,
        password: password
      });

      // Extract token and userId from response
      const { token, userId } = response.data;
      
      // Store authentication data with 30-minute expiration
      storeAuthData(userId, token);

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.response?.data || "Invalid credentials");
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    alert("Password reset is not enabled. Please contact Parallel administrators for assistance.");
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src="/assets/Logo_Operator.svg" alt="Parallel Operator" className="logo-operator" />
        
        <form onSubmit={handleLogin}>
          {/* Remove fake fields that were preventing autofill */}
          
          <input
            type="text"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username" // Enable username autofill
            name="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" // Keep password autofill
            name="password"
          />
          <button type="submit" className="login-button">Login</button>
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
