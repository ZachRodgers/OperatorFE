import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import customers from "../data/customer_master.json";

const OwnerDashboard = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();

  // Find the logged-in customer
  const customer = customers.find((c) => c.customerId === customerId);

  if (!customer) {
    return <h1>Error: Customer not found</h1>;
  }

  return (
    <div className="dashboard-container">
      <h1>Owner Dashboard</h1>
      <p>Welcome, {customer.name}! Here are your assigned lots:</p>

      <ul>
        {customer.assignedLots.map((lotId) => (
          <li key={lotId}>
            <button onClick={() => navigate(`/${customerId}/${lotId}/revenue-dashboard`)}>
              Lot {lotId}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OwnerDashboard;
