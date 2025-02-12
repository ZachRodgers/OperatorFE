import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import customers from "../data/customer_master.json";
import { clearSession } from "../utils/auth"; // Import logout function

const OwnerDashboard = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();

  // Find the logged-in customer
  const customer = customers.find((c) => c.customerId === customerId);

  if (!customer) {
    return <h1>Error: Customer not found</h1>;
  }

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <h1>Owner Dashboard</h1>
      <p>Assigned lots:</p>

      <ul>
        {customer.assignedLots.map((lotId) => (
          <li key={lotId}>
            <button onClick={() => navigate(`/${customerId}/${lotId}/revenue-dashboard`)}>
              Lot {lotId}
            </button>
          </li>
        ))}
      </ul>

      {/* Logout Button */}
      <button onClick={handleLogout} className="logout-button">Logout</button>
    </div>
  );
};

export default OwnerDashboard;
