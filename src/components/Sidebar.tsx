import React, { useEffect, useState } from "react";
import { NavLink, useParams, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { lotService } from "../utils/api";
import "./Sidebar.css";

const Sidebar = () => {
  const { lotId } = useParams();
  const navigate = useNavigate();
  const { user, userLots, fetchUserLots, logout } = useUser();
  const [lotName, setLotName] = useState<string>("Unknown Lot");
  const [hasMultipleLots, setHasMultipleLots] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Effect to load and persist lot information
  useEffect(() => {
    const loadLotData = async () => {
      if (!lotId) {
        setIsLoading(false);
        return;
      }

      try {
        // First check localStorage for cached lot name
        const cachedLotName = localStorage.getItem(`lot_${lotId}_name`);
        
        // If we have a cached name, use it initially while we fetch the latest
        if (cachedLotName) {
          setLotName(cachedLotName);
        }

        // Fetch current lot information
        const lotData = await lotService.getLotById(lotId);
        if (lotData) {
          // Update state with lot name
          setLotName(lotData.lotName || "Unknown Lot");
          // Cache the lot name for persistence
          localStorage.setItem(`lot_${lotId}_name`, lotData.lotName);
        }

        // Get multiple lots status from localStorage or from context
        if (userLots && userLots.length > 0) {
          setHasMultipleLots(userLots.length > 1);
          // Store for persistence
          localStorage.setItem('user_has_multiple_lots', userLots.length > 1 ? 'true' : 'false');
        } else {
          // If userLots is empty, try to fetch them
          const lots = await fetchUserLots();
          setHasMultipleLots(lots.length > 1);
          // Store for persistence
          localStorage.setItem('user_has_multiple_lots', lots.length > 1 ? 'true' : 'false');
        }
      } catch (error) {
        console.error("Error loading lot data:", error);
        
        // Fall back to localStorage if API calls fail
        const cachedLotName = localStorage.getItem(`lot_${lotId}_name`);
        if (cachedLotName) {
          setLotName(cachedLotName);
        }
        
        const cachedHasMultipleLots = localStorage.getItem('user_has_multiple_lots') === 'true';
        setHasMultipleLots(cachedHasMultipleLots);
      } finally {
        setIsLoading(false);
      }
    };

    loadLotData();
  }, [lotId, userLots, fetchUserLots]);

  if (!lotId) return null; // Prevent rendering if lotId is missing

  // Truncate lot name if it exceeds 36 characters
  const truncatedLotName = lotName.length > 36 ? lotName.substring(0, 36) + "..." : lotName;

  // Handle logout
  const handleLogout = () => {
    logout();
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src="/assets/Logo_Operator.svg" alt="Parallel Operator" className="logo" />
        <div className="lot-box">
          <p className="lot-id">{isLoading ? "Loading..." : truncatedLotName}</p>
        </div>
        {/* Only show Change Lot if the user has more than one lot */}
        {hasMultipleLots && (
          <NavLink to="/owner-dashboard" className="change-lot">
            <img src="/assets/BackIcon.svg" alt="Back" className="back-icon" />
            Change Lot
          </NavLink>
        )}
      </div>
      <nav className="sidebar-menu">
        <NavLink to={`/lot/${lotId}/revenue-dashboard`} className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          {({ isActive }) => (
            <>
              <img src={`/assets/nav/${isActive ? "DashboardSelected.svg" : "Dashboard1.svg"}`} alt="Dashboard" />
              <span className={isActive ? "active-text" : ""}>Dashboard</span>
            </>
          )}
        </NavLink>
        <NavLink to={`/lot/${lotId}/occupants`} className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          {({ isActive }) => (
            <>
              <img src={`/assets/nav/${isActive ? "OccupantsSelected.svg" : "Occupants.svg"}`} alt="Occupants" />
              <span className={isActive ? "active-text" : ""}>Occupants</span>
            </>
          )}
        </NavLink>
        <NavLink to={`/lot/${lotId}/settings`} className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          {({ isActive }) => (
            <>
              <img src={`/assets/nav/${isActive ? "SettingsSelected.svg" : "Settings.svg"}`} alt="Settings" />
              <span className={isActive ? "active-text" : ""}>Settings</span>
            </>
          )}
        </NavLink>
        <NavLink to={`/lot/${lotId}/advanced`} className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          {({ isActive }) => (
            <>
              <img src={`/assets/nav/${isActive ? "AdvancedSelected.svg" : "Advanced.svg"}`} alt="Advanced" />
              <span className={isActive ? "active-text" : ""}>Advanced</span>
            </>
          )}
        </NavLink>
        <NavLink to={`/lot/${lotId}/registry`} className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          {({ isActive }) => (
            <>
              <img src={`/assets/nav/${isActive ? "RegistrySelected.svg" : "Registry.svg"}`} alt="Registry" />
              <span className={isActive ? "active-text" : ""}>Registry</span>
            </>
          )}
        </NavLink>
        <NavLink to={`/lot/${lotId}/notifications`} className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          {({ isActive }) => (
            <>
              <img src={`/assets/nav/${isActive ? "NotificationsSelected.svg" : "Notifications.svg"}`} alt="Notifications" />
              <span className={isActive ? "active-text" : ""}>Notifications</span>
            </>
          )}
        </NavLink>
        <NavLink to={`/lot/${lotId}/addons`} className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          {({ isActive }) => (
            <>
              <img src={`/assets/nav/${isActive ? "AddonsSelected.svg" : "Addons.svg"}`} alt="Addons" />
              <span className={isActive ? "active-text" : ""}>Addons</span>
            </>
          )}
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <NavLink to={`/lot/${lotId}/account`} className={({ isActive }) => isActive ? "sidebar-item active" : "sidebar-item"}>
          {({ isActive }) => (
            <>
              <img src={`/assets/nav/${isActive ? "AccountSelected.svg" : "Account.svg"}`} alt="Account" />
              <span className={isActive ? "active-text" : ""}>Account</span>
            </>
          )}
        </NavLink>
        <div className="sidebar-item logout" onClick={handleLogout}>
          <img src="/assets/nav/Logout.svg" alt="Logout" />
          <span>Logout</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
