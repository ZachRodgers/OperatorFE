import React, { ReactElement } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom";
import Login from "./pages/Login";
import OwnerDashboard from "./pages/OwnerDashboard";
import RevenueDashboard from "./pages/RevenueDashboard";
import { getSession } from "./utils/auth"; 
import "./App.css";

const ProtectedRoute = ({ element, requiresLot }: { element: ReactElement; requiresLot?: boolean }) => {
  const user = getSession(); // Get stored session data

  if (!user) {
    return <Navigate to="/login" />; // Redirect if no valid session
  }

  // If route requires a specific lot, check permissions
  if (requiresLot) {
    const { lotId } = useParams(); // Get lotId from the route
    if (!lotId || !user.assignedLots.includes(lotId)) {
      return <Navigate to="/login" />; // Redirect if user doesn't have access
    }
  }

  return element;
};


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/:customerId/owner-dashboard"
          element={<ProtectedRoute element={<OwnerDashboard />} />}
        />
        <Route
          path="/:customerId/:lotId/revenue-dashboard"
          element={<ProtectedRoute element={<RevenueDashboard />} requiresLot />}
        />
      </Routes>
    </Router>
  );
}

export default App;
