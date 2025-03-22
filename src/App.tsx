import React, { ReactElement } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";
import { UserProvider } from "./context/UserContext";
import UserRedirect from "./components/UserRedirect";
import "./App.css";

// Ensure Sidebar is properly exported from Sidebar.tsx
if (!Sidebar) {
  console.error("Sidebar component not found. Ensure Sidebar.tsx is exported correctly.");
}

// Ensure PageLayout is defined AFTER all imports
const PageLayout = ({ children }: { children: ReactElement }) => (
  <div className="app-container">
    <Sidebar />
    <div className="content">{children}</div>
  </div>
);

// The main App component now just sets up routes and providers
function App() {
  return (
    <Router>
      <UserProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <UserRedirect />
            </ProtectedRoute>
          } />
          
          <Route path="/owner-dashboard" element={
            <ProtectedRoute>
              <OwnerDashboard />
            </ProtectedRoute>
          } />
          
          {/* Legacy/compatibility routes */}
          <Route path="/:customerId/owner-dashboard" element={
            <ProtectedRoute>
              <OwnerDashboard />
            </ProtectedRoute>
          } />
          
          {/* Lot-specific routes */}
          <Route path="/lot/:lotId/revenue-dashboard" element={
            <ProtectedRoute>
              <PageLayout><RevenueDashboard /></PageLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/lot/:lotId/occupants" element={
            <ProtectedRoute>
              <PageLayout><ParkedCars /></PageLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/lot/:lotId/settings" element={
            <ProtectedRoute>
              <PageLayout><Settings /></PageLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/lot/:lotId/advanced" element={
            <ProtectedRoute>
              <PageLayout><AdvancedSettings /></PageLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/lot/:lotId/registry" element={
            <ProtectedRoute>
              <PageLayout><PlateRegistry /></PageLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/lot/:lotId/notifications" element={
            <ProtectedRoute>
              <PageLayout><Notifications /></PageLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/lot/:lotId/addons" element={
            <ProtectedRoute>
              <PageLayout><Addons /></PageLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/lot/:lotId/account" element={
            <ProtectedRoute>
              <PageLayout><Account /></PageLayout>
            </ProtectedRoute>
          } />
          
          {/* Legacy routes - for backward compatibility */}
          <Route path="/:customerId/:lotId/revenue-dashboard" element={
            <ProtectedRoute>
              <PageLayout><RevenueDashboard /></PageLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/:customerId/:lotId/occupants" element={
            <ProtectedRoute>
              <PageLayout><ParkedCars /></PageLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/:customerId/:lotId/settings" element={
            <ProtectedRoute>
              <PageLayout><Settings /></PageLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/:customerId/:lotId/advanced" element={
            <ProtectedRoute>
              <PageLayout><AdvancedSettings /></PageLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/:customerId/:lotId/registry" element={
            <ProtectedRoute>
              <PageLayout><PlateRegistry /></PageLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/:customerId/:lotId/notifications" element={
            <ProtectedRoute>
              <PageLayout><Notifications /></PageLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/:customerId/:lotId/addons" element={
            <ProtectedRoute>
              <PageLayout><Addons /></PageLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/:customerId/:lotId/account" element={
            <ProtectedRoute>
              <PageLayout><Account /></PageLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </UserProvider>
    </Router>
  );
}

export default App;
