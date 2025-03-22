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

  return (
    <div className="login-container">
      <div className="login-box">
        <img src="/assets/Logo_Operator.svg" alt="Parallel Operator" className="logo-operator" />
        
        <div className="info-message">
          <p>Access granted for SuperAdmin and Operator roles</p>
        </div>

        <form onSubmit={handleLogin} autoComplete="off">
          {/* Fake Hidden Fields to Stop Autofill */}
          <input type="text" name="fakeuser" style={{ display: "none" }} />
          <input type="password" name="fakepassword" style={{ display: "none" }} />

          <input
            type="text"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            name="email-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            name="password-input"
          />
          <button type="submit" className="login-button">Login</button>
          {error && <p className="error">{error}</p>}
        </form>

        <a href="#" className="forgot-password">Forgot my password</a>
      </div>
      <footer>
        <img src="/assets/PoweredbyParallelDark.svg" alt="Powered by Parallel" className="powered-by-logo" />
      </footer>
    </div>
  );
};

export default Login;
