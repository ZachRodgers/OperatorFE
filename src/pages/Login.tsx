import React, { useState } from "react";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleBypassLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsRedirecting(true);

    setTimeout(() => {
      window.location.href = "/lot/PWP-PL-0000001/revenue-dashboard";
    }, 500);
  };

  if (isRedirecting) {
    return (
      <div className="login-container">
        <div className="login-box">
          <img src="/assets/Logo_Operator.svg" alt="Parallel Operator" className="logo-operator" />
          <div className="redirecting-message">
            <div className="spinner"></div>
            <p>Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <img src="/assets/Logo_Operator.svg" alt="Parallel Operator" className="logo-operator" />

        <form onSubmit={handleBypassLogin}>
          <input
            type="text"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            name="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            name="password"
          />
          <button type="submit" className="login-button">
            Bypass Login
          </button>
        </form>
      </div>
      <footer>
        <img src="/assets/PoweredbyParallelDark.svg" alt="Powered by Parallel" className="powered-by-logo" />
      </footer>
    </div>
  );
};

export default Login;
