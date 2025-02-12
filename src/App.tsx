import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import OwnerDashboard from "./pages/OwnerDashboard";
import RevenueDashboard from "./pages/RevenueDashboard";
import "./App.css";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/:customerId/owner-dashboard" element={<OwnerDashboard />} />
        <Route path="/:customerId/:lotId/revenue-dashboard" element={<RevenueDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
