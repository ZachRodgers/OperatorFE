import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import customersData from "../data/customer_master.json";
import { storeSession } from "../utils/auth"; // Import new session storage functions
import "./Login.css";

// Define the customer type
interface Customer {
  customerId: string;
  name: string;
  email: string;
  phoneNo: string;
  role: string;
  password: string;
  assignedLots: string[];
  isVerified: string;
  lastLogin: string;
}

const customers: Customer[] = customersData;

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); 
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Find user by email and password
    const customer = customers.find(
      (c) => c.email === email && c.password === password
    );

    if (customer) {
      setError("");

      // Store session in localStorage
      storeSession({
        customerId: customer.customerId,
        role: customer.role,
        assignedLots: customer.assignedLots,
      });

      // Redirect based on role
      if (customer.role === "owner" && customer.assignedLots.length > 1) {
        navigate(`/${customer.customerId}/owner-dashboard`);
      } else {
        navigate(`/${customer.customerId}/${customer.assignedLots[0]}/revenue-dashboard`);
      }
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src="/assets/Logo_Operator.svg" alt="Parallel Operator" className="logo-operator" />
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
