import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import customers from "../data/customer_master.json";
import "./Login.css";

const Login = () => {
  const [lotId, setLotId] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Find the user based on lotId and password
    const customer = customers.find(
      (c) => c.assignedLots.includes(lotId) && c.operatorPassword === password
    );

    if (customer) {
      // Redirect logic
      if (customer.role === "owner" && customer.assignedLots.length > 1) {
        navigate(`/${customer.customerId}/owner-dashboard`);
      } else {
        navigate(`/${customer.customerId}/${lotId}/revenue-dashboard`);
      }
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src="/assets/Logo_Operator.svg" alt="Parallel Operator" className="logo-operator" />
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Lot ID"
            value={lotId}
            onChange={(e) => setLotId(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="login-button">Login</button>
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
