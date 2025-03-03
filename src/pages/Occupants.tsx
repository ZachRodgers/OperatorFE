import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import parkingSessionsData from "../data/parking_sessions.json";
import lotPricing from "../data/lot_pricing.json";
import lotsData from "../data/lots_master.json"; // Import lots data
import "./Occupants.css";

interface ParkingSession {
  sessionId: string;
  vehicleId: string;
  userId: string;
  lotId: string;
  entryTime: string;
  exitTime: string;
  parkingStatus: string;
  totalAmount: number;
  isValidated: boolean;
  isInRegistry: boolean;
  plate: string;
}

const Occupants: React.FC = () => {
  const { lotId } = useParams<{ lotId: string }>();

  const [sessions, setSessions] = useState<ParkingSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("plate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Find the current lot info (to get lotCapacity)
  const currentLot = lotsData.find((l) => l.lotId === lotId);
  const lotCapacity = currentLot?.lotCapacity ?? 0;

  useEffect(() => {
    // Filter relevant sessions for this lot
    const relevant = parkingSessionsData.filter((s) => s.lotId === lotId);
    setSessions(relevant);
  }, [lotId]);

  // occupant count
  const occupantCount = sessions.length;

  // check if validation is allowed
  const pricing = lotPricing.find((entry) => entry.lotId === lotId);
  const allowValidation = pricing?.allowValidation ?? false;

  // local validation toggle
  const handleValidate = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.sessionId === sessionId ? { ...s, isValidated: true } : s
      )
    );
  };

  // remove occupant
  const handleRemove = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
  };

  // occupant status
  const getStatus = (s: ParkingSession) => {
    if (s.isValidated) return "Validated";
    if (s.isInRegistry) return "Registered";
    return "Active";
  };

  // sort handling
  const handleSort = (column: string) => {
    setSortOrder(sortBy === column && sortOrder === "asc" ? "desc" : "asc");
    setSortBy(column);
  };

  // duration calculations
  const getDurationMinutes = (time: string) => {
    const now = new Date();
    const entered = new Date(time);
    return Math.floor((now.getTime() - entered.getTime()) / 60000);
  };
  const formatDuration = (m: number) => {
    if (m < 60) return `${m} minutes`;
    const hrs = Math.floor(m / 60);
    const mins = m % 60;
    return `${hrs}h ${mins}m`;
  };

  // filtering & sorting
  const filteredSessions = sessions
    .filter((s) =>
      Object.values(s).some((val) =>
        val.toString().toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
    .sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";

      if (sortBy === "plate") {
        valA = a.plate;
        valB = b.plate;
      } else if (sortBy === "arrivalDate") {
        valA = new Date(a.entryTime).setHours(0, 0, 0, 0);
        valB = new Date(b.entryTime).setHours(0, 0, 0, 0);
      } else if (sortBy === "arrivalTime") {
        const dA = new Date(a.entryTime);
        const dB = new Date(b.entryTime);
        valA = dA.getHours() * 60 + dA.getMinutes();
        valB = dB.getHours() * 60 + dB.getMinutes();
      } else if (sortBy === "duration") {
        valA = getDurationMinutes(a.entryTime);
        valB = getDurationMinutes(b.entryTime);
      } else if (sortBy === "status") {
        valA = getStatus(a);
        valB = getStatus(b);
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return 0;
    });

  // format date/time
  const getDateStr = (t: string) => {
    const d = new Date(t);
    return d.toLocaleDateString();
  };
  const getTimeStr = (t: string) => {
    const d = new Date(t);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="occupants-page">
      <div className="occupants-header">
        <h1>
          Occupants {occupantCount}/{lotCapacity}
        </h1>
        <p>Current Vehicle Plates in Your Lot</p>
      </div>

      <div className="occupants-search-bar">
        <img src="/assets/SearchBarIcon.svg" alt="Search" />
        <input
          type="text"
          placeholder="Search plate, time, date, duration..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <table className="occupants-table">
        <thead>
          <tr>
            <th
              onClick={() => handleSort("plate")}
              className={`sortable-column ${sortBy === "plate" ? "active" : ""}`}
            >
              Plate
              <img
                src={`/assets/${
                  sortBy === "plate" ? "SortArrowSelected.svg" : "SortArrow.svg"
                }`}
                alt="Sort"
                className={`sort-arrow ${sortOrder}`}
              />
            </th>
            <th
              onClick={() => handleSort("arrivalTime")}
              className={`sortable-column ${
                sortBy === "arrivalTime" ? "active" : ""
              }`}
            >
              Arrival Time
              <img
                src={`/assets/${
                  sortBy === "arrivalTime"
                    ? "SortArrowSelected.svg"
                    : "SortArrow.svg"
                }`}
                alt="Sort"
                className={`sort-arrow ${sortOrder}`}
              />
            </th>
            <th
              onClick={() => handleSort("arrivalDate")}
              className={`sortable-column ${
                sortBy === "arrivalDate" ? "active" : ""
              }`}
            >
              Arrival Date
              <img
                src={`/assets/${
                  sortBy === "arrivalDate"
                    ? "SortArrowSelected.svg"
                    : "SortArrow.svg"
                }`}
                alt="Sort"
                className={`sort-arrow ${sortOrder}`}
              />
            </th>
            <th
              onClick={() => handleSort("duration")}
              className={`sortable-column ${
                sortBy === "duration" ? "active" : ""
              }`}
            >
              Duration
              <img
                src={`/assets/${
                  sortBy === "duration"
                    ? "SortArrowSelected.svg"
                    : "SortArrow.svg"
                }`}
                alt="Sort"
                className={`sort-arrow ${sortOrder}`}
              />
            </th>
            <th
              onClick={() => handleSort("status")}
              className={`sortable-column ${
                sortBy === "status" ? "active" : ""
              }`}
            >
              Status
              <img
                src={`/assets/${
                  sortBy === "status"
                    ? "SortArrowSelected.svg"
                    : "SortArrow.svg"
                }`}
                alt="Sort"
                className={`sort-arrow ${sortOrder}`}
              />
            </th>
            <th>Remove</th>
          </tr>
        </thead>
        <tbody>
          {filteredSessions.map((session) => {
            const durationMins = getDurationMinutes(session.entryTime);
            const isVal = session.isValidated;
            const isReg = session.isInRegistry;

            // Determine occupant status
            const statusStr = getStatus(session);

            return (
              <tr key={session.sessionId}>
                <td>
                  <div className="plate-badge">{session.plate}</div>
                </td>
                <td>{getTimeStr(session.entryTime)}</td>
                <td>{getDateStr(session.entryTime)}</td>
                <td>{formatDuration(durationMins)}</td>
                <td>
                  {allowValidation && !isVal && !isReg && (
                    <button
                      className="validate-button"
                      onClick={() => handleValidate(session.sessionId)}
                    >
                      Validate
                    </button>
                  )}
                  {allowValidation && isVal && (
                    <button className="validate-button validated" disabled>
                      Validated
                    </button>
                  )}
                  {!isVal && isReg && <span className="registered-label">Registered</span>}
                  {!allowValidation && statusStr === "Active" && <span></span>}
                </td>
                <td>
                  <img
                    src="/assets/Minus.svg"
                    alt="Remove occupant"
                    className="remove-icon"
                    onClick={() => handleRemove(session.sessionId)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Occupants;
