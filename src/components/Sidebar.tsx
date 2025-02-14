import React from "react";
import { NavLink, useParams } from "react-router-dom";
import "./Sidebar.css";

const Sidebar = () => {
  const { customerId, lotId } = useParams();

  if (!customerId || !lotId) return null; // Prevent rendering if params are missing

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src="/assets/Logo_Operator.svg" alt="Parallel Operator" className="logo" />
        <div className="lot-box">
          <p className="lot-id">{lotId} Insert name here instead</p>
        </div>
        <NavLink to={`/${customerId}/change-lot`} className="change-lot">
          <img src="/assets/BackIcon.svg" alt="Back" className="back-icon" />
          Change Lot
        </NavLink>
      </div>
      <nav className="sidebar-menu">
        <NavLink to={`/${customerId}/${lotId}/revenue-dashboard`} className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          {({ isActive }) => (
            <>
              <img src={`/assets/nav/${isActive ? "DashboardSelected.svg" : "Dashboard1.svg"}`} alt="Dashboard" />
              <span className={isActive ? "active-text" : ""}>Dashboard</span>
            </>
          )}
        </NavLink>
        <NavLink to={`/${customerId}/${lotId}/parked-cars`} className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          {({ isActive }) => (
            <>
              <img src={`/assets/nav/${isActive ? "ParkedCarsSelected.svg" : "ParkedCars.svg"}`} alt="Parked Cars" />
              <span className={isActive ? "active-text" : ""}>Occupants</span>
            </>
          )}
        </NavLink>
        <NavLink to={`/${customerId}/${lotId}/settings`} className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          {({ isActive }) => (
            <>
              <img src={`/assets/nav/${isActive ? "SettingsSelected.svg" : "Settings.svg"}`} alt="Settings" />
              <span className={isActive ? "active-text" : ""}>Settings</span>
            </>
          )}
        </NavLink>
        <NavLink to={`/${customerId}/${lotId}/advanced`} className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          {({ isActive }) => (
            <>
              <img src={`/assets/nav/${isActive ? "AdvancedSelected.svg" : "Advanced.svg"}`} alt="Advanced" />
              <span className={isActive ? "active-text" : ""}>Advanced</span>
            </>
          )}
        </NavLink>
        <NavLink to={`/${customerId}/${lotId}/registry`} className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          {({ isActive }) => (
            <>
              <img src={`/assets/nav/${isActive ? "RegistrySelected.svg" : "Registry.svg"}`} alt="Registry" />
              <span className={isActive ? "active-text" : ""}>Registry</span>
            </>
          )}
        </NavLink>
        <NavLink to={`/${customerId}/${lotId}/notifications`} className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          {({ isActive }) => (
            <>
              <img src={`/assets/nav/${isActive ? "NotificationsSelected.svg" : "Notifications.svg"}`} alt="Notifications" />
              <span className={isActive ? "active-text" : ""}>Notifications</span>
            </>
          )}
        </NavLink>
        <NavLink to={`/${customerId}/${lotId}/addons`} className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          {({ isActive }) => (
            <>
              <img src={`/assets/nav/${isActive ? "AddonsSelected.svg" : "Addons.svg"}`} alt="Addons" />
              <span className={isActive ? "active-text" : ""}>Addons</span>
            </>
          )}
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <NavLink to={`/${customerId}/${lotId}/account`} className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          {({ isActive }) => (
            <>
              <img src={`/assets/nav/${isActive ? "AccountSelected.svg" : "Account.svg"}`} alt="Account" />
              <span className={isActive ? "active-text" : ""}>Account</span>
            </>
          )}
        </NavLink>
        <NavLink to="/login" className="sidebar-item logout">
          <img src="/assets/nav/Logout.svg" alt="Logout" />
          <span>Logout</span>
        </NavLink>
      </div>
    </div>
  );
};

export default Sidebar;
