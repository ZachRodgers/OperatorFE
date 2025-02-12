import React from "react";
import { useParams } from "react-router-dom";

const RevenueDashboard = () => {
  const { customerId, lotId } = useParams();

  return (
    <div className="dashboard-container">
      <h1>Revenue Dashboard</h1>
      <p> Lot {lotId}.</p>
    </div>
  );
};

export default RevenueDashboard;
