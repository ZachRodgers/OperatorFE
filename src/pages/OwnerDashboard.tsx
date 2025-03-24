import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import AccountModal from "../components/AccountModal";
import "./OwnerDashboard.css";

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const { user, userLots, loading, error, fetchUserLots, logout } = useUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("lotId");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Fetch lots when component mounts if not already loaded
  useEffect(() => {
    if (userLots.length === 0) {
      fetchUserLots();
    }
  }, [fetchUserLots, userLots]);

  const handleLogout = () => {
    logout();
  };

  const handleSort = (column: string) => {
    setSortOrder(sortBy === column && sortOrder === "asc" ? "desc" : "asc");
    setSortBy(column);
  };

  // Filter and sort lots based on searchQuery and sort settings
  const filteredLots = userLots
    .filter((lot) =>
      Object.values(lot).some((value) => 
        value ? value.toString().toLowerCase().includes(searchQuery.toLowerCase()) : false
      )
    )
    .sort((a, b) => {
      const valueA = a[sortBy as keyof typeof a];
      const valueB = b[sortBy as keyof typeof b];

      if (typeof valueA === "string" && typeof valueB === "string") {
        return sortOrder === "asc"
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }
      return 0;
    });

// Helper function to format the lot ID by removing the "PWP-PL-" prefix and inserting a dash.
const formatLotId = (id: string): string => {
  const prefix = "PWP-PL-";
  let numericPart = id;
  if (id.startsWith(prefix)) {
    numericPart = id.substring(prefix.length);
  }
  // If the numeric part has at least 8 characters, format it as "XXXX-XXXX"
  if (numericPart.length >= 8) {
    return `${numericPart.slice(0, 4)}-${numericPart.slice(4, 8)}`;
  }
  return numericPart;
};


  // Show loading state
  if (loading) {
    return <div className="loading-state">Loading lots...</div>;
  }

  // Show error state
  if (error) {
    return <div className="error-state">Error: {error}</div>;
  }

  // Show empty state if no lots found
  if (userLots.length === 0) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <div className="header-content">
            <img src="/assets/Logo_Owner.svg" alt="Logo" className="logo-owner" />
            <div className="header-actions">
              <button className="icon-button account" onClick={() => setShowAccountModal(true)}>
                <img src="/assets/nav/Account.svg" alt="Account" />
                <span>Account</span>
              </button>
              <button className="icon-button logout" onClick={handleLogout}>
                <img src="/assets/nav/Logout.svg" alt="Logout" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
        <div className="dashboard-content">
          <div className="empty-state">
            <h2>No Lots Found</h2>
            <p>You don't have any lots assigned to your account.</p>
          </div>
        </div>
        <AccountModal isOpen={showAccountModal} onClose={() => setShowAccountModal(false)} />
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <img src="/assets/Logo_Owner.svg" alt="Logo" className="logo-owner" />
          <div className="header-actions">
            <button className="icon-button account" onClick={() => setShowAccountModal(true)}>
              <img src="/assets/nav/Account.svg" alt="Account" />
              <span>{user?.name || 'User'}</span>
            </button>
            <button className="icon-button logout" onClick={handleLogout}>
              <img src="/assets/nav/Logout.svg" alt="Logout" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="dashboard-content">
        <div className="search-bar">
          <img src="/assets/SearchBarIcon.svg" alt="Search" />
          <input
            type="text"
            placeholder="Search LotID, Name, or Location"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Table */}
        <table className="dashboard-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("lotId")} className={`sortable-column ${sortBy === "lotId" ? "active" : ""}`}>
                Lot ID
                <img
                  src={`/assets/${sortBy === "lotId" ? "SortArrowSelected.svg" : "SortArrow.svg"}`}
                  alt="Sort"
                  className={`sort-arrow ${sortOrder}`}
                />
              </th>
              <th onClick={() => handleSort("lotName")} className={`sortable-column ${sortBy === "lotName" ? "active" : ""}`}>
                Lot Name
                <img
                  src={`/assets/${sortBy === "lotName" ? "SortArrowSelected.svg" : "SortArrow.svg"}`}
                  alt="Sort"
                  className={`sort-arrow ${sortOrder}`}
                />
              </th>
              <th onClick={() => handleSort("address")} className={`sortable-column ${sortBy === "address" ? "active" : ""}`}>
                Address
                <img
                  src={`/assets/${sortBy === "address" ? "SortArrowSelected.svg" : "SortArrow.svg"}`}
                  alt="Sort"
                  className={`sort-arrow ${sortOrder}`}
                />
              </th>
              <th onClick={() => handleSort("accountCreated")} className={`sortable-column ${sortBy === "accountCreated" ? "active" : ""}`}>
                Purchase Date
                <img
                  src={`/assets/${sortBy === "accountCreated" ? "SortArrowSelected.svg" : "SortArrow.svg"}`}
                  alt="Sort"
                  className={`sort-arrow ${sortOrder}`}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLots.map((lot) => (
              <tr key={lot.lotId} onClick={() => navigate(`/lot/${lot.lotId}/revenue-dashboard`)}>
                <td>{formatLotId(lot.lotId)}</td>
                <td>{lot.lotName}</td>
                <td>{lot.address}</td>
                <td>{lot.accountCreated || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Account Modal */}
      <AccountModal isOpen={showAccountModal} onClose={() => setShowAccountModal(false)} />
    </div>
  );
};

export default OwnerDashboard;
