import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import lotsData from "../data/lots_master.json";
import vehicleRegistryData from "../data/vehicle_registry.json";
import Modal from "../components/Modal";
import Slider from "../components/Slider";
import Tooltip from "../components/Tooltip";
import "./PlateRegistry.css";

interface VehicleRegistryEntry {
  lotId: string;
  vehicleId: string;
  plate: string;
  name: string;
  email: string;
  phone: string;
}

/** Distinguish a real row from the placeholder row. */
interface RegistryRow extends VehicleRegistryEntry {
  isPlaceholder?: boolean;  // if true, this row shows "+ Plate", etc.
  isEditing?: boolean;      // whether this row is in edit mode
}

type ModalType =
  | "disableRegistry"
  | "unsavedChanges"
  | "removeVehicle"
  | "confirmSave"
  | null;

const PlateRegistry: React.FC = () => {
  const { lotId } = useParams<{ lotId: string }>();

  // Find the current lot
  const currentLot = lotsData.find((lot) => lot.lotId === lotId);
  const originalRegistryOn = currentLot?.registryOn ?? false;

  // Local states
  const [registryOn, setRegistryOn] = useState<boolean>(originalRegistryOn);
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"plate" | "name" | "email" | "phone">("plate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isDirty, setIsDirty] = useState(false);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [removalVehicleId, setRemovalVehicleId] = useState<string | null>(null);

  // Track if we turned registry from off->on
  const turnedRegistryOn = useRef(false);

  /** On mount: load relevant rows, plus one placeholder row. */
  useEffect(() => {
    const relevant = vehicleRegistryData.filter((v) => v.lotId === lotId);
    const realRows: RegistryRow[] = relevant.map((r) => ({
      ...r,
      isPlaceholder: false,
      isEditing: false,
    }));
    // Sort them initially by plate
    realRows.sort((a, b) => a.plate.localeCompare(b.plate));

    // Add a single placeholder row at the end
    realRows.push(createPlaceholderRow());

    setRows(realRows);
  }, [lotId]);

  /** Create a fresh placeholder row. */
  const createPlaceholderRow = (): RegistryRow => ({
    lotId: lotId || "",
    vehicleId: `PL_${Math.floor(Math.random() * 100000)}`, // unique ID
    plate: "+ Plate",
    name: "Name",
    email: "email@address.com",
    phone: "000-000-0000",
    isPlaceholder: true,
    isEditing: false,
  });

  // ----------------- REGISTRY ON/OFF -----------------
  const handleToggleRegistry = () => {
    if (!registryOn) {
      // turning on => local only, require save
      setRegistryOn(true);
      if (!originalRegistryOn) {
        turnedRegistryOn.current = true;
        setIsDirty(true);
      }
    } else {
      // turning off => immediate confirm
      if (isDirty) {
        setModalType("unsavedChanges");
        setModalOpen(true);
      } else {
        setModalType("disableRegistry");
        setModalOpen(true);
      }
    }
  };

  const confirmDisableRegistry = async () => {
    // immediate update lots_master: registryOn=false
    try {
      if (currentLot && currentLot.registryOn !== false) {
        const resp = await fetch("http://localhost:5000/update-lot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lotId: currentLot.lotId,
            updatedData: { registryOn: false },
          }),
        });
        if (!resp.ok) throw new Error("Failed to disable registry on server.");
      }
      setRegistryOn(false);
      setIsDirty(false);
      turnedRegistryOn.current = false;
      closeModal();
    } catch (error) {
      console.error(error);
      alert("Error disabling registry.");
      closeModal();
    }
  };

  const confirmDiscardChanges = async () => {
    await confirmDisableRegistry();
    closeModal();
  };

  // --------------- SEARCH & SORT ---------------
  const filteredRows = rows
    .filter((r) => {
      // If it's the placeholder row, always show if registryOn
      if (r.isPlaceholder && !registryOn) {
        return false;
      }
      // normal search for real row
      const str = `${r.plate} ${r.name} ${r.email} ${r.phone}`.toLowerCase();
      return str.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      // Put the placeholder row at the bottom always
      if (a.isPlaceholder && !b.isPlaceholder) return 1;
      if (b.isPlaceholder && !a.isPlaceholder) return -1;

      if (a.isPlaceholder && b.isPlaceholder) {
        // If both are placeholders, sort by vehicleId just to keep stable
        return a.vehicleId.localeCompare(b.vehicleId);
      }

      let valA = "";
      let valB = "";
      if (sortBy === "plate") {
        valA = a.plate;
        valB = b.plate;
      } else if (sortBy === "name") {
        valA = a.name;
        valB = b.name;
      } else if (sortBy === "email") {
        valA = a.email;
        valB = b.email;
      } else if (sortBy === "phone") {
        valA = a.phone;
        valB = b.phone;
      }
      const cmp = valA.localeCompare(valB);
      return sortOrder === "asc" ? cmp : -cmp;
    });

  const handleSort = (col: "plate" | "name" | "email" | "phone") => {
    setSortOrder(sortBy === col && sortOrder === "asc" ? "desc" : "asc");
    setSortBy(col);
  };

  // --------------- EDIT MODE ---------------
  /** Only one row can be in edit mode at a time. */
  const toggleEditRow = (rowId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.vehicleId === rowId) {
          return { ...r, isEditing: !r.isEditing };
        }
        // turn off edit for all other rows
        return { ...r, isEditing: false };
      })
    );
  };

  /** When user clicks anywhere outside inputs, we exit edit mode if not placeholder. */
  const handleGlobalClick = (e: MouseEvent) => {
    // If the user clicked inside an input or an icon, do nothing
    const target = e.target as HTMLElement;
    if (
      target.closest(".registry-input") ||
      target.closest(".plate-input") ||
      target.closest(".edit-icon") ||
      target.closest(".remove-icon") ||
      target.closest(".placeholder-input")
    ) {
      return;
    }
    // Otherwise, turn off editing for all non-placeholder rows
    setRows((prev) =>
      prev.map((r) => (r.isPlaceholder ? r : { ...r, isEditing: false }))
    );
  };

  useEffect(() => {
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  // --------------- FIELD CHANGES ---------------
  /** If row is placeholder and user modifies any field from default, convert it to a real row. */
  const handleFieldChange = (
    rowId: string,
    field: keyof VehicleRegistryEntry,
    value: string
  ) => {
    setRows((prev) => {
      const newState = prev.map((r) => {
        if (r.vehicleId === rowId) {
          // If it's a placeholder and user typed something, we convert it to real row
          if (r.isPlaceholder) {
            // If user is editing the placeholder text (like "+ Plate"), once changed => real row
            const changed = value.trim() !== "" && value.trim() !== r[field];
            if (changed && (r[field].startsWith("+ ") || r[field] === "Name" || r[field] === "email@address.com" || r[field] === "000-000-0000")) {
              // Convert to real row
              r.isPlaceholder = false;
              r.isEditing = true; // now it's in edit mode
              // Add a new placeholder row below
              newState.push(createPlaceholderRow());
            }
          }
          return { ...r, [field]: value };
        }
        return r;
      });
      return newState;
    });
    setIsDirty(true);
  };

  // --------------- REMOVE ---------------
  const handleRemoveRow = (vehicleId: string) => {
    setRemovalVehicleId(vehicleId);
    setModalType("removeVehicle");
    setModalOpen(true);
  };

  const confirmRemoveVehicle = () => {
    if (removalVehicleId) {
      setRows((prev) => prev.filter((r) => r.vehicleId !== removalVehicleId));
      setIsDirty(true);
    }
    closeModal();
  };

  // --------------- SAVE ---------------
  const handleSave = () => {
    setModalType("confirmSave");
    setModalOpen(true);
  };

  const confirmSaveChanges = async () => {
    try {
      // Filter out placeholder rows
      const finalRows = rows.filter((r) => !r.isPlaceholder).map((r) => ({
        lotId: r.lotId,
        vehicleId: r.vehicleId,
        plate: r.plate,
        name: r.name,
        email: r.email,
        phone: r.phone,
      }));

      // Overwrite vehicle_registry.json
      const resp = await fetch("http://localhost:5000/update-vehicle-registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalRows),
      });
      if (!resp.ok) throw new Error("Failed to update registry.");

      // If we turned registry on from off, update lots_master
      if (currentLot && turnedRegistryOn.current) {
        const lotUpdateResp = await fetch("http://localhost:5000/update-lot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lotId: currentLot.lotId,
            updatedData: { registryOn: true },
          }),
        });
        if (!lotUpdateResp.ok) throw new Error("Failed to enable registry on server.");
      }

      setIsDirty(false);
      turnedRegistryOn.current = false;
      closeModal();
    } catch (error) {
      console.error(error);
      alert("Error saving changes.");
      closeModal();
    }
  };

  // --------------- UTILS ---------------
  const closeModal = () => {
    setModalOpen(false);
    setModalType(null);
    setRemovalVehicleId(null);
  };

  // --------------- RENDER ---------------
  // Whether to fade out other rows’ icons if a row is in edit mode
  const someRowIsEditing = rows.some((r) => r.isEditing);

  return (
    <div className="content">
      {/* Title & Slider on left */}
      <div className="top-row">
        <h1>Plate Registry</h1>
        <Slider checked={registryOn} onChange={handleToggleRegistry} />
      </div>

      {/* If registry off => short message only */}
      {!registryOn && (
        <p>
          Enable the Plate Registry to add license plates that will not be charged when parked in the lot.
        </p>
      )}

      {/* If on => show note, plus row with search, upload, and Save */}
      {registryOn && (
        <>
          <p>
            These license plates will <strong>not</strong> be charged for parking in your lot.
            You can add them manually, upload a spreadsheet, or purchase an addon for monthly billing.
          </p>

          {/* Search, Upload, Save in one row (right aligned) */}
          <div className="actions-row">
            <div className="registry-search-bar">
              <img src="/assets/SearchBarIcon.svg" alt="Search" />
              <input
                type="text"
                placeholder="Search plate, name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="upload-wrapper">
              <button className="button secondary" onClick={() => alert("Not implemented!")}>
                Upload Sheet
              </button>
              {/* The info icon & tooltip can float outside to avoid clipping */}
              <div className="tooltip-icon-container">
                <Tooltip
                  text="Our system will parse your spreadsheet to add plates automatically."
                  position="left"
                />
              </div>
            </div>

            <button
              className="button primary"
              onClick={handleSave}
              disabled={!isDirty}
            >
              Save
            </button>
          </div>

          {/* Table */}
          <table className="registry-table">
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
                  onClick={() => handleSort("name")}
                  className={`sortable-column ${sortBy === "name" ? "active" : ""}`}
                >
                  Name
                  <img
                    src={`/assets/${
                      sortBy === "name" ? "SortArrowSelected.svg" : "SortArrow.svg"
                    }`}
                    alt="Sort"
                    className={`sort-arrow ${sortOrder}`}
                  />
                </th>
                <th
                  onClick={() => handleSort("email")}
                  className={`sortable-column ${sortBy === "email" ? "active" : ""}`}
                >
                  Email
                  <img
                    src={`/assets/${
                      sortBy === "email" ? "SortArrowSelected.svg" : "SortArrow.svg"
                    }`}
                    alt="Sort"
                    className={`sort-arrow ${sortOrder}`}
                  />
                </th>
                <th
                  onClick={() => handleSort("phone")}
                  className={`sortable-column ${sortBy === "phone" ? "active" : ""}`}
                >
                  Phone Number
                  <img
                    src={`/assets/${
                      sortBy === "phone" ? "SortArrowSelected.svg" : "SortArrow.svg"
                    }`}
                    alt="Sort"
                    className={`sort-arrow ${sortOrder}`}
                  />
                </th>
                <th className="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const isRowEditing = row.isEditing;
                const fadeIcons = someRowIsEditing && !isRowEditing;

                if (row.isPlaceholder) {
                  // Placeholder row
                  return (
                    <tr key={row.vehicleId} className="placeholder-row">
                      <td>
                        <input
                          type="text"
                          className="placeholder-input"
                          value={row.plate}
                          onChange={(e) => handleFieldChange(row.vehicleId, "plate", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="placeholder-input"
                          value={row.name}
                          onChange={(e) => handleFieldChange(row.vehicleId, "name", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="placeholder-input"
                          value={row.email}
                          onChange={(e) => handleFieldChange(row.vehicleId, "email", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="placeholder-input"
                          value={row.phone}
                          onChange={(e) => handleFieldChange(row.vehicleId, "phone", e.target.value)}
                        />
                      </td>
                      <td>
                        <img
                          src="/assets/Plus.svg"
                          alt="Add row"
                          className={'add-icon'}
                        />
                      </td>
                    </tr>
                  );
                }

                // Normal row
                return (
                  <tr key={row.vehicleId}>
                    <td>
                      {isRowEditing ? (
                        <input
                          type="text"
                          className="registry-input"
                          value={row.plate}
                          onChange={(e) => handleFieldChange(row.vehicleId, "plate", e.target.value)}
                        />
                      ) : (
                        <div className="plate-badge-reg">{row.plate}</div>
                      )}
                    </td>
                    <td>
                      {isRowEditing ? (
                        <input
                          type="text"
                          className="registry-input"
                          value={row.name}
                          onChange={(e) => handleFieldChange(row.vehicleId, "name", e.target.value)}
                        />
                      ) : (
                        <span>{row.name}</span>
                      )}
                    </td>
                    <td>
                      {isRowEditing ? (
                        <input
                          type="text"
                          className="registry-input"
                          value={row.email}
                          onChange={(e) => handleFieldChange(row.vehicleId, "email", e.target.value)}
                        />
                      ) : (
                        <span>{row.email}</span>
                      )}
                    </td>
                    <td>
                      {isRowEditing ? (
                        <input
                          type="text"
                          className="registry-input"
                          value={row.phone}
                          onChange={(e) => handleFieldChange(row.vehicleId, "phone", e.target.value)}
                        />
                      ) : (
                        <span>{row.phone}</span>
                      )}
                    </td>
                    <td>
                      <img
                        src="/assets/Edit2.svg"
                        alt="Edit entry"
                        className={`edit-icon ${fadeIcons ? "faded" : ""}`}
                        onClick={() => {
                          if (!fadeIcons) toggleEditRow(row.vehicleId);
                        }}
                      />
                      <img
                        src="/assets/Minus.svg"
                        alt="Remove entry"
                        className={`remove-icon ${fadeIcons ? "faded" : ""}`}
                        onClick={() => {
                          if (!fadeIcons) handleRemoveRow(row.vehicleId);
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {/* MODALS */}
      {modalOpen && modalType === "disableRegistry" && (
        <Modal
          isOpen
          title="Disable Registry?"
          description="This will immediately remove free-parking privileges for all plates in your registry. They will be billed normally."
          confirmText="Disable"
          cancelText="Cancel"
          onConfirm={() => {
            confirmDisableRegistry();
            setModalType(null);
          }}
          onCancel={closeModal}
        />
      )}
      {modalOpen && modalType === "removeVehicle" && (
        <Modal
          isOpen
          title="Remove Registry Entry"
          description="Removing this entry means the vehicle will no longer be exempt from billing. You cannot undo this action unless you add them again."
          confirmText="Remove"
          cancelText="Cancel"
          onConfirm={() => {
            confirmRemoveVehicle();
            setModalType(null);
          }}
          onCancel={closeModal}
        />
      )}
      {modalOpen && modalType === "unsavedChanges" && (
        <Modal
          isOpen
          title="You have unsaved changes!"
          description="Changes will not be applied unless you save before leaving. Do you want to discard them and disable the registry?"
          confirmText="Discard & Disable"
          cancelText="Keep Editing"
          onConfirm={() => {
            confirmDiscardChanges();
            setModalType(null);
          }}
          onCancel={closeModal}
        />
      )}
      {modalOpen && modalType === "confirmSave" && (
        <Modal
          isOpen
          title="Confirm Changes"
          description="You're about to update the plate registry on the server."
          confirmText="Save Registry"
          cancelText="Return"
          onConfirm={() => {
            confirmSaveChanges();
            setModalType(null);
          }}
          onCancel={closeModal}
        />
      )}
    </div>
  );
};

export default PlateRegistry;
