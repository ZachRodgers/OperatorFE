import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { clearSession } from "../utils/auth"; // Import logout function

const RevenueDashboard = () => {
  const { customerId, lotId } = useParams();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  return (
    <div className="content">
      <h1>Revenue Dashboard</h1>
      <p>Lot {lotId}.</p>

      {/* Logout Button */}
      <button onClick={handleLogout} className="logout-button">Logout</button>
    </div>
  );
};

export default RevenueDashboard;
