import React, { ReactElement } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom";
import Login from "./pages/Login";
import OwnerDashboard from "./pages/OwnerDashboard";
import RevenueDashboard from "./pages/RevenueDashboard";
import ParkedCars from "./pages/Occupants";
import Settings from "./pages/Settings";
import AdvancedSettings from "./pages/AdvancedSettings";
import PlateRegistry from "./pages/PlateRegistry";
import Notifications from "./pages/Notifications";
import Addons from "./pages/Addons";
import Account from "./pages/Account";
import Sidebar from "./components/Sidebar";  // Make sure this is correctly imported
import { getSession } from "./utils/auth";
import "./App.css";

// Ensure Sidebar is properly exported from Sidebar.tsx
if (!Sidebar) {
  console.error("Sidebar component not found. Ensure Sidebar.tsx is exported correctly.");
}

const ProtectedRoute = ({ element, requiresLot }: { element: ReactElement; requiresLot?: boolean }) => {
  const user = getSession();
  if (!user) return <Navigate to="/login" />;
  
  if (requiresLot) {
    const { lotId } = useParams();
    if (!lotId || !user.assignedLots.includes(lotId)) return <Navigate to="/login" />;
  }

  return element;
};

// Ensure PageLayout is defined AFTER all imports
const PageLayout = ({ children }: { children: ReactElement }) => (
  <div className="app-container">
    <Sidebar />
    <div className="content">{children}</div>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/:customerId/owner-dashboard" element={<ProtectedRoute element={<OwnerDashboard />} />} />
        
        {/* Pages using Sidebar layout */}
        <Route path="/:customerId/:lotId/revenue-dashboard" element={<ProtectedRoute element={<PageLayout><RevenueDashboard /></PageLayout>} requiresLot />} />
        <Route path="/:customerId/:lotId/occupants" element={<ProtectedRoute element={<PageLayout><ParkedCars /></PageLayout>} requiresLot />} />
        <Route path="/:customerId/:lotId/settings" element={<ProtectedRoute element={<PageLayout><Settings /></PageLayout>} requiresLot />} />
        <Route path="/:customerId/:lotId/advanced" element={<ProtectedRoute element={<PageLayout><AdvancedSettings /></PageLayout>} requiresLot />} />
        <Route path="/:customerId/:lotId/registry" element={<ProtectedRoute element={<PageLayout><PlateRegistry /></PageLayout>} requiresLot />} />
        <Route path="/:customerId/:lotId/notifications" element={<ProtectedRoute element={<PageLayout><Notifications /></PageLayout>} requiresLot />} />
        <Route path="/:customerId/:lotId/addons" element={<ProtectedRoute element={<PageLayout><Addons /></PageLayout>} requiresLot />} />
        <Route path="/:customerId/:lotId/account" element={<ProtectedRoute element={<PageLayout><Account /></PageLayout>} requiresLot />} />
      </Routes>
    </Router>
  );
}

export default App;
