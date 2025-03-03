import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import parkingSessionsData from "../data/parking_sessions.json";
import lotPricing from "../data/lot_pricing.json";
import lotsData from "../data/lots_master.json";
import Modal from "../components/Modal";
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

type ModalType = "removeVehicle" | "removeValidation" | null;

const Occupants: React.FC = () => {
  const { lotId } = useParams<{ lotId: string }>();

  const [sessions, setSessions] = useState<ParkingSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("plate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // For modal control
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalSessionId, setModalSessionId] = useState<string | null>(null);

  // Find current lot info (capacity)
  const currentLot = lotsData.find((l) => l.lotId === lotId);
  const lotCapacity = currentLot?.lotCapacity ?? 0;

  useEffect(() => {
    const relevant = parkingSessionsData.filter((s) => s.lotId === lotId);
    setSessions(relevant);
  }, [lotId]);

  const occupantCount = sessions.length;

  // Check if validation is allowed
  const pricing = lotPricing.find((entry) => entry.lotId === lotId);
  const allowValidation = pricing?.allowValidation ?? false;

  // Helper to set occupant validated
  const handleValidate = (sessionId: string) => {
    // If occupant is not validated, validate immediately (no modal)
    setSessions((prev) =>
      prev.map((s) =>
        s.sessionId === sessionId ? { ...s, isValidated: true } : s
      )
    );
  };

  // If occupant is validated, we want a modal to remove validation
  const handleRemoveValidationModal = (sessionId: string) => {
    setModalType("removeValidation");
    setModalSessionId(sessionId);
    setModalOpen(true);
  };

  const confirmRemoveValidation = () => {
    if (modalSessionId) {
      setSessions((prev) =>
        prev.map((s) =>
          s.sessionId === modalSessionId ? { ...s, isValidated: false } : s
        )
      );
    }
    closeModal();
  };

  // Show a modal before removing occupant from the lot
  const handleRemoveVehicleModal = (sessionId: string) => {
    setModalType("removeVehicle");
    setModalSessionId(sessionId);
    setModalOpen(true);
  };

  const confirmRemoveVehicle = () => {
    if (modalSessionId) {
      setSessions((prev) => prev.filter((s) => s.sessionId !== modalSessionId));
    }
    closeModal();
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalType(null);
    setModalSessionId(null);
  };

  // occupant status
  const getStatus = (s: ParkingSession) => {
    if (s.isValidated) return "Validated";
    if (s.isInRegistry) return "Registered";
    return "Active";
  };

  // sorting
  const handleSort = (column: string) => {
    setSortOrder(sortBy === column && sortOrder === "asc" ? "desc" : "asc");
    setSortBy(column);
  };

  // duration
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

  // filter & sort
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
    <div className="content">
      <div className="occupants-header">
        <h1>
          Occupants{" "}
          <span className="occupant-count">
            {occupantCount}/{lotCapacity}
          </span>
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
            {/* Narrow column for remove icon (no heading) */}
            <th className="remove-column"></th>
          </tr>
        </thead>
        <tbody>
          {filteredSessions.map((session) => {
            const durationMins = getDurationMinutes(session.entryTime);
            const isVal = session.isValidated;
            const isReg = session.isInRegistry;
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
                  {/* Validation logic */}
                  {allowValidation && !isVal && !isReg && (
                    <button
                      className="validate-button"
                      onClick={() => handleValidate(session.sessionId)}
                    >
                      Validate
                    </button>
                  )}
                  {allowValidation && isVal && (
                    <button
                      className="validate-button validated"
                      onClick={() => handleRemoveValidationModal(session.sessionId)}
                    >
                      Validated
                    </button>
                  )}
                  {!isVal && isReg && (
                    <span className="registered-label">Registered</span>
                  )}
                  {/* If validation isn't allowed and status is Active, we show blank or any label */}
                  {!allowValidation && statusStr === "Active" && <span></span>}
                </td>
                <td>
                  <img
                    src="/assets/Minus.svg"
                    alt="Remove occupant"
                    className="remove-icon"
                    onClick={() => handleRemoveVehicleModal(session.sessionId)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* MODALS */}
      {modalOpen && modalType === "removeVehicle" && (
        <Modal
          isOpen
          title="Remove Vehicle"
          description="Confirming this action will remove this vehicle from your lot. They will not be billed or logged. You cannot undo this action."
          confirmText="Remove Vehicle"
          cancelText="Cancel"
          onConfirm={confirmRemoveVehicle}
          onCancel={closeModal}
        />
      )}

      {modalOpen && modalType === "removeValidation" && (
        <Modal
          isOpen
          title="Remove Validation"
          description="This vehicle was already validated. Removing validation means the vehicle will be billed for their stay."
          confirmText="Remove Validation"
          cancelText="Keep Validated"
          onConfirm={confirmRemoveValidation}
          onCancel={closeModal}
        />
      )}
    </div>
  );
};

export default Occupants;
