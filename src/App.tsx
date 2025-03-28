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
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";
import { UserProvider } from "./contexts/UserContext";
import { LotProvider } from "./contexts/LotContext";
import UserRedirect from "./components/UserRedirect";
import "./App.css";

// Ensure Sidebar is properly exported from Sidebar.tsx
if (!Sidebar) {
  console.error("Sidebar component not found. Ensure Sidebar.tsx is exported correctly.");
}

// LotProviderWrapper - extracts lotId from URL and provides it to LotProvider
const LotProviderWrapper = ({ children }: { children: ReactElement }) => {
  const { lotId } = useParams<{ lotId: string }>();
  return (
    <LotProvider lotId={lotId}>
      {children}
    </LotProvider>
  );
};

// PageLayout with LotProvider for lot-specific routes
const LotPageLayout = ({ children }: { children: ReactElement }) => (
  <LotProviderWrapper>
    <div className="app-container">
      <Sidebar />
      <div className="content">{children}</div>
    </div>
  </LotProviderWrapper>
);

// Regular PageLayout for non-lot-specific routes
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

          {/* Lot-specific routes with LotProvider */}
          <Route path="/lot/:lotId/revenue-dashboard" element={
            <ProtectedRoute>
              <LotPageLayout><RevenueDashboard /></LotPageLayout>
            </ProtectedRoute>
          } />

          <Route path="/lot/:lotId/occupants" element={
            <ProtectedRoute>
              <LotPageLayout><ParkedCars /></LotPageLayout>
            </ProtectedRoute>
          } />

          <Route path="/lot/:lotId/settings" element={
            <ProtectedRoute>
              <LotPageLayout><Settings /></LotPageLayout>
            </ProtectedRoute>
          } />

          <Route path="/lot/:lotId/advanced" element={
            <ProtectedRoute>
              <LotPageLayout><AdvancedSettings /></LotPageLayout>
            </ProtectedRoute>
          } />

          <Route path="/lot/:lotId/registry" element={
            <ProtectedRoute>
              <LotPageLayout><PlateRegistry /></LotPageLayout>
            </ProtectedRoute>
          } />

          <Route path="/lot/:lotId/notifications" element={
            <ProtectedRoute>
              <LotPageLayout><Notifications /></LotPageLayout>
            </ProtectedRoute>
          } />

          <Route path="/lot/:lotId/addons" element={
            <ProtectedRoute>
              <LotPageLayout><Addons /></LotPageLayout>
            </ProtectedRoute>
          } />

          <Route path="/lot/:lotId/account" element={
            <ProtectedRoute>
              <LotPageLayout><Account /></LotPageLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </UserProvider>
    </Router>
  );
}

export default App;
