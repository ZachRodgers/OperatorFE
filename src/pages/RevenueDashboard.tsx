import React from "react";
import { useParams } from "react-router-dom";
import lots from "../data/lots_master.json"; // Import lot data
import "./RevenueDashboard.css"; // Ensure proper styling

const RevenueDashboard = () => {
  const { customerId, lotId } = useParams();

  // Find the corresponding lot
  const lot = lots.find((l) => l.lotId === lotId);
  const lotName = lot ? (lot.lotName.length > 50 ? lot.lotName.substring(0, 50) + "..." : lot.lotName) : "Unknown Lot";

  return (
    <div className="content">
      <h1>
        Dashboard  <span className="lot-name"> {lotName}</span>
      </h1>
      <p>Lot {lotId}.</p>
    </div>
  );
};

export default RevenueDashboard;
