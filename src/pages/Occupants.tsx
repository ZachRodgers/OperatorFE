import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Modal from "../components/Modal";
import "./Occupants.css";
import { sessionService, lotPricingService } from "../utils/api";
import axios, { AxiosError } from 'axios';
import { useLot } from "../contexts/LotContext";
import LoadingWheel from "../components/LoadingWheel";

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
  plate?: string;
}

type ModalType = "removeVehicle" | "removeValidation" | null;

const Occupants: React.FC = () => {
  const { lotId } = useParams<{ lotId: string }>();
  const { lotData } = useLot(); // Use the lot context to get lot data

  const [sessions, setSessions] = useState<ParkingSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("plate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lotPricing, setLotPricing] = useState<any>(null);

  // For modal control
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalSessionId, setModalSessionId] = useState<string | null>(null);

  // Get lot capacity from the context instead of the hardcoded JSON
  const lotCapacity = lotData?.lotCapacity ?? 0;

  // Fetch lot pricing data
  const fetchLotPricing = async () => {
    if (!lotId) return;
    try {
      const pricingData = await lotPricingService.getLatestPricingByLotId(lotId);
      setLotPricing(pricingData);
    } catch (err) {
      console.error("Failed to fetch lot pricing:", err);
      setError("Failed to load lot pricing data. Please try again.");
    }
  };

  // Fetch sessions from the backend
  const fetchSessions = async () => {
    if (!lotId) return;

    setLoading(true);
    try {
      const response = await sessionService.getSessionsByLot(lotId);
      console.log("Sessions response:", response);

      // Get active sessions (we need to make sure we only show active vehicles)
      const activeSessions = response.filter(
        (session: ParkingSession) =>
          session.parkingStatus.toUpperCase() === "ACTIVE" &&
          !session.exitTime
      );

      // For now, use the vehicleId as the plate until we integrate with vehicle service
      const sessionsWithPlate = activeSessions.map((session: ParkingSession) => ({
        ...session,
        plate: session.vehicleId || `Vehicle-${session.sessionId.slice(-4)}`
      }));

      setSessions(sessionsWithPlate);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
      setError("Failed to load occupant data. Please try again.");
      setSessions([]); // Clear sessions on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchLotPricing();
    // Setup a refresh interval to keep data current
    const interval = setInterval(fetchSessions, 30000); // refresh every 30 seconds
    return () => clearInterval(interval);
  }, [lotId]);

  useEffect(() => {
    // Add request interceptor for debugging
    const requestInterceptor = axios.interceptors.request.use(request => {
      console.log('Starting Request', {
        url: request.url,
        method: request.method,
        data: request.data,
        params: request.params
      });
      return request;
    });

    // Add response interceptor for debugging
    const responseInterceptor = axios.interceptors.response.use(
      response => {
        console.log('Response:', {
          status: response.status,
          data: response.data,
          url: response.config.url
        });
        return response;
      },
      error => {
        console.error('Request Failed:', error.config);
        if (error.response) {
          console.error('Status:', error.response.status);
          console.error('Data:', error.response.data);
        }
        return Promise.reject(error);
      }
    );

    // Clean up interceptors when component unmounts
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  const occupantCount = sessions.length;

  // Check if validation is allowed using the API data
  const allowValidation = lotPricing?.allowValidation ?? false;

  // Helper to set occupant validated
  const handleValidate = async (sessionId: string) => {
    try {
      await sessionService.validateSession(sessionId, true, "operator"); // Assume operator is modifying
      // Update local state to reflect change immediately
      setSessions((prev) =>
        prev.map((s) =>
          s.sessionId === sessionId ? { ...s, isValidated: true } : s
        )
      );
    } catch (err) {
      console.error("Failed to validate session:", err);
      setError("Failed to validate vehicle. Please try again.");
    }
  };

  // If occupant is validated, we want a modal to remove validation
  const handleRemoveValidationModal = (sessionId: string) => {
    setModalType("removeValidation");
    setModalSessionId(sessionId);
    setModalOpen(true);
  };

  const confirmRemoveValidation = async () => {
    if (modalSessionId) {
      try {
        await sessionService.validateSession(modalSessionId, false, "operator");
        // Update local state
        setSessions((prev) =>
          prev.map((s) =>
            s.sessionId === modalSessionId ? { ...s, isValidated: false } : s
          )
        );
      } catch (err) {
        console.error("Failed to remove validation:", err);
        setError("Failed to remove validation. Please try again.");
      }
    }
    closeModal();
  };

  // Show a modal before removing occupant from the lot
  const handleRemoveVehicleModal = (sessionId: string) => {
    setModalType("removeVehicle");
    setModalSessionId(sessionId);
    setModalOpen(true);
  };

  const confirmRemoveVehicle = async () => {
    if (modalSessionId) {
      try {
        console.log(`Removing vehicle with session ID: ${modalSessionId}`);

        // Show more details before attempting deletion
        console.log("Current sessions before deletion:", sessions);

        // Call the DELETE endpoint
        await sessionService.deleteSession(modalSessionId);
        console.log("Delete session completed");

        // Wait before refreshing (gives the backend time to process)
        await new Promise(resolve => setTimeout(resolve, 500));

        // Re-fetch sessions to update the UI
        await fetchSessions();

        console.log("Sessions after deletion:", sessions);
      } catch (err: unknown) {
        console.error("Failed to remove vehicle:", err);
        if (axios.isAxiosError(err) && err.response) {
          console.error("Error response:", err.response.data);
          console.error("Status:", err.response.status);
        }
        setError("Failed to remove vehicle. Please try again.");
      }
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
        val?.toString().toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
    .sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";

      if (sortBy === "plate") {
        valA = a.plate || "";
        valB = b.plate || "";
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

  if (loading) {
    return <LoadingWheel text="Loading occupant data..." />;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

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
                src={`/assets/${sortBy === "plate" ? "SortArrowSelected.svg" : "SortArrow.svg"
                  }`}
                alt="Sort"
                className={`sort-arrow ${sortOrder}`}
              />
            </th>
            <th
              onClick={() => handleSort("arrivalTime")}
              className={`sortable-column ${sortBy === "arrivalTime" ? "active" : ""
                }`}
            >
              Arrival Time
              <img
                src={`/assets/${sortBy === "arrivalTime"
                  ? "SortArrowSelected.svg"
                  : "SortArrow.svg"
                  }`}
                alt="Sort"
                className={`sort-arrow ${sortOrder}`}
              />
            </th>
            <th
              onClick={() => handleSort("arrivalDate")}
              className={`sortable-column ${sortBy === "arrivalDate" ? "active" : ""
                }`}
            >
              Arrival Date
              <img
                src={`/assets/${sortBy === "arrivalDate"
                  ? "SortArrowSelected.svg"
                  : "SortArrow.svg"
                  }`}
                alt="Sort"
                className={`sort-arrow ${sortOrder}`}
              />
            </th>
            <th
              onClick={() => handleSort("duration")}
              className={`sortable-column ${sortBy === "duration" ? "active" : ""
                }`}
            >
              Duration
              <img
                src={`/assets/${sortBy === "duration"
                  ? "SortArrowSelected.svg"
                  : "SortArrow.svg"
                  }`}
                alt="Sort"
                className={`sort-arrow ${sortOrder}`}
              />
            </th>
            <th
              onClick={() => handleSort("status")}
              className={`sortable-column ${sortBy === "status" ? "active" : ""
                }`}
            >
              Status
              <img
                src={`/assets/${sortBy === "status"
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
            // Log each session so we can debug in the browser console
            console.log("Session in list:", session);

            const durationMins = getDurationMinutes(session.entryTime);
            const isVal = session.isValidated;
            const isReg = session.isInRegistry;
            const statusStr = getStatus(session);

            // Make sure we have a valid session ID
            if (!session.sessionId) {
              console.error("Session missing ID:", session);
            }

            return (
              <tr key={session.sessionId || Math.random()}>
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
                    onClick={() => {
                      console.log(`Initiating removal of session: ${session.sessionId}`);
                      handleRemoveVehicleModal(session.sessionId);
                    }}
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
