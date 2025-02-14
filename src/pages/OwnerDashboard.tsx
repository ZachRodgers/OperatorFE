import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import customers from "../data/customer_master.json";
import lots from "../data/lots_master.json";
import { clearSession } from "../utils/auth";
import "./OwnerDashboard.css";

const OwnerDashboard = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();

  const customer = customers.find((c) => c.customerId === customerId);
  if (!customer) return <h1>Error: Customer not found</h1>;

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("lotId");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  const handleSort = (column: string) => {
    setSortOrder(sortBy === column && sortOrder === "asc" ? "desc" : "asc");
    setSortBy(column);
  };

  const filteredLots = lots
    .filter((lot) => customer.assignedLots.includes(lot.lotId))
    .filter((lot) =>
      Object.values(lot).some((value) =>
        value.toString().toLowerCase().includes(searchQuery.toLowerCase())
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

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <img src="/assets/Logo_Owner.svg" alt="Logo" className="logo-owner" />
          <div className="header-actions">
            <button className="icon-button account" onClick={() => alert("Not yet implemented")}>
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

      {/* Search Bar */}
      <div className="dashboard-content">
        <div className="search-bar">
          <img src="/assets/SearchBarIcon.svg" alt="Search" />
          <input
            type="text"
            placeholder="Search LotID, Customer, Date or Location"
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
              <tr key={lot.lotId} onClick={() => navigate(`/${customerId}/${lot.lotId}/revenue-dashboard`)}>
                <td>{lot.lotId}</td>
                <td>{lot.lotName}</td>
                <td>{lot.address}</td>
                <td>{lot.accountCreated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OwnerDashboard;
