import React, { ReactElement } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
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
import UnprotectedRoute from "./components/UnprotectedRoute";
import { UserProvider } from "./contexts/UserContext";
import { LotProvider } from "./contexts/LotContext";
import UserRedirect from "./components/UserRedirect";
import "./App.css";
import "./styles/april-fools.css";  // April Fools styles!

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
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Previously protected routes */}
          <Route path="/dashboard" element={
            <UnprotectedRoute>
              <UserRedirect />
            </UnprotectedRoute>
          } />

          <Route path="/owner-dashboard" element={
            <UnprotectedRoute>
              <OwnerDashboard />
            </UnprotectedRoute>
          } />

          {/* Lot-specific routes with LotProvider */}
          <Route path="/lot/:lotId/revenue-dashboard" element={
            <UnprotectedRoute>
              <LotPageLayout><RevenueDashboard /></LotPageLayout>
            </UnprotectedRoute>
          } />

          <Route path="/lot/:lotId/occupants" element={
            <UnprotectedRoute>
              <LotPageLayout><ParkedCars /></LotPageLayout>
            </UnprotectedRoute>
          } />

          <Route path="/lot/:lotId/settings" element={
            <UnprotectedRoute>
              <LotPageLayout><Settings /></LotPageLayout>
            </UnprotectedRoute>
          } />

          <Route path="/lot/:lotId/advanced" element={
            <UnprotectedRoute>
              <LotPageLayout><AdvancedSettings /></LotPageLayout>
            </UnprotectedRoute>
          } />

          <Route path="/lot/:lotId/registry" element={
            <UnprotectedRoute>
              <LotPageLayout><PlateRegistry /></LotPageLayout>
            </UnprotectedRoute>
          } />

          <Route path="/lot/:lotId/notifications" element={
            <UnprotectedRoute>
              <LotPageLayout><Notifications /></LotPageLayout>
            </UnprotectedRoute>
          } />

          <Route path="/lot/:lotId/addons" element={
            <UnprotectedRoute>
              <LotPageLayout><Addons /></LotPageLayout>
            </UnprotectedRoute>
          } />

          <Route path="/lot/:lotId/account" element={
            <UnprotectedRoute>
              <LotPageLayout><Account /></LotPageLayout>
            </UnprotectedRoute>
          } />
        </Routes>
      </UserProvider>
    </Router>
  );
}

export default App;
