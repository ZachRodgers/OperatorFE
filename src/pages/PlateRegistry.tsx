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

interface RegistryRow extends VehicleRegistryEntry {
  isPlaceholder?: boolean;  // "Add new" row
  isEditing?: boolean;      // row-level edit mode
}

type ModalType =
  | "disableRegistry"
  | "unsavedChanges"
  | "removeVehicle"
  | "confirmSave"
  | null;

const PlateRegistry: React.FC = () => {
  const { lotId } = useParams<{ lotId: string }>();
  const currentLot = lotsData.find((lot) => lot.lotId === lotId);

  // Keep track of the server's known "registryOn" so we can handle immediate disable if it's truly on.
  // We'll update this whenever we successfully enable or disable on the server.
  const [serverRegistryOn, setServerRegistryOn] = useState<boolean>(currentLot?.registryOn ?? false);

  // Our local slider state. If user toggles ON, we only finalize on Save (unless it was already on).
  const [registryOn, setRegistryOn] = useState<boolean>(serverRegistryOn);

  // Table rows
  const [rows, setRows] = useState<RegistryRow[]>([]);
  // Sorting/searching
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"plate" | "name" | "email" | "phone">("plate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  // Track unsaved changes => for Save button + modals
  const [isDirty, setIsDirty] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [removalVehicleId, setRemovalVehicleId] = useState<string | null>(null);

  // If user toggles from off->on locally, we track that to know if we must update the server on Save
  const turnedRegistryOn = useRef(false);

  // On mount: load table data
  useEffect(() => {
    const relevant = vehicleRegistryData.filter((v) => v.lotId === lotId);
    const realRows: RegistryRow[] = relevant.map((r) => ({
      ...r,
      isPlaceholder: false,
      isEditing: false,
    }));
    // Sort them initially by plate
    realRows.sort((a, b) => a.plate.localeCompare(b.plate));

    // Add a single placeholder row
    realRows.push(createPlaceholderRow());
    setRows(realRows);
  }, [lotId]);

  /** Create a fresh placeholder row. */
  function createPlaceholderRow(): RegistryRow {
    return {
      lotId: lotId || "",
      vehicleId: `PL_${Math.floor(Math.random() * 100000)}`,
      plate: "",
      name: "",
      email: "",
      phone: "",
      isPlaceholder: true,
      isEditing: false,
    };
  }

  // ------------------- REGISTRY TOGGLE -------------------
  const handleToggleRegistry = () => {
    if (!registryOn) {
      // turning local slider ON
      if (!serverRegistryOn) {
        // was off on server => we'll finalize on Save
        turnedRegistryOn.current = true;
        setIsDirty(true);
      }
      setRegistryOn(true);
    } else {
      // turning local slider OFF => immediate confirm
      if (isDirty) {
        setModalType("unsavedChanges");
        setModalOpen(true);
      } else {
        setModalType("disableRegistry");
        setModalOpen(true);
      }
    }
  };

  /** Immediately disable registry on the server + local UI. */
  const confirmDisableRegistry = async () => {
    try {
      // If server was truly on, we must update it
      if (serverRegistryOn) {
        const resp = await fetch("http://localhost:5000/update-lot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lotId,
            updatedData: { registryOn: false },
          }),
        });
        if (!resp.ok) throw new Error("Failed to disable registry on server.");
      }
      // Now reflect locally
      setServerRegistryOn(false);
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

  // ------------------- SORT + SEARCH -------------------
  /** Returns the final array of rows after filtering, sorting, and pinning editing row on top. */
  const getFilteredAndSortedRows = (): RegistryRow[] => {
    let working = [...rows];
  
    // If registry is off => hide placeholder row
    if (!registryOn) {
      working = working.filter((r) => !r.isPlaceholder);
    }
  
    // Filter by search
    working = working.filter((r) => {
      const str = `${r.plate} ${r.name} ${r.email} ${r.phone}`.toLowerCase();
      return str.includes(searchQuery.toLowerCase());
    });
  
    // Sort normally
    working.sort((a, b) => {
      // If both placeholders or both real rows, normal logic applies
      if (a.isPlaceholder && b.isPlaceholder) {
        return a.vehicleId.localeCompare(b.vehicleId); // stable
      }
      if (a.isPlaceholder && !b.isPlaceholder) return 1;  // by default placeholders at bottom
      if (!a.isPlaceholder && b.isPlaceholder) return -1; // or top—(we’ll fix this below)
      
      // Real row sorting
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
  
    // --- Force the placeholder row to the very top ---
    // (We’ll find the placeholder row, remove it, unshift it)
    const placeholderIndex = working.findIndex((r) => r.isPlaceholder);
    if (placeholderIndex >= 0) {
      const [placeholderRow] = working.splice(placeholderIndex, 1);
      working.unshift(placeholderRow);
    }
  
    // --- Pin editing row below the placeholder row ---
    // (Find an editing row that’s not the placeholder, remove, then insert at index=1)
    const editingIndex = working.findIndex((r) => r.isEditing && !r.isPlaceholder);
    if (editingIndex > -1) {
      const [editingRow] = working.splice(editingIndex, 1);
      // If we have a placeholder row at [0], place editing row at [1].
      // If no placeholder row (e.g., registry is off), place at 0. 
      const targetIndex = placeholderIndex >= 0 ? 1 : 0;
      working.splice(targetIndex, 0, editingRow);
    }
  
    return working;
  };
  
  const handleSort = (col: "plate" | "name" | "email" | "phone") => {
    setSortOrder(sortBy === col && sortOrder === "asc" ? "desc" : "asc");
    setSortBy(col);
  };

  // ------------------- EDIT MODE -------------------
// ...
const toggleEditRow = (vehicleId: string) => {
  setRows((prev) => {
    return prev.map((row) => {
      if (row.vehicleId === vehicleId) {
        // If we're currently editing, and we want to turn off edit mode
        if (row.isEditing) {
          // Check if the row is truly empty (all fields blank) and not a placeholder
          const allEmpty =
            !row.plate.trim() &&
            !row.name.trim() &&
            !row.email.trim() &&
            !row.phone.trim();

          // If empty => remove from array
          if (allEmpty && !row.isPlaceholder) {
            // We'll remove it in a separate pass below
            return { ...row, isEditing: false, vehicleId: "TO_BE_REMOVED" };
          }
          // Otherwise just toggle off edit
          return { ...row, isEditing: false };
        } else {
          // Turn on edit mode, turn off for all others
          return { ...row, isEditing: true };
        }
      }
      // Turn off edit for all other rows
      return { ...row, isEditing: false };
    }).filter((r) => r.vehicleId !== "TO_BE_REMOVED"); // Filter out any empty row
  });
};
// ...


  /** If user clicks outside an input/icon => end edit mode for real rows. */
  const handleGlobalClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // If the user clicked inside an input or an icon, do nothing
    if (
      target.closest(".registry-input") ||
      target.closest(".plate-input") ||
      target.closest(".edit-icon") ||
      target.closest(".remove-icon") ||
      target.closest(".placeholder-input")
    ) {
      return;
    }
  
    setRows((prev) => {
      // First, end edit mode for all non-placeholder rows
      let newRows = prev.map((row) =>
        row.isPlaceholder ? row : { ...row, isEditing: false }
      );
  
      // Then, remove any real row that is completely empty
      newRows = newRows.filter((row) => {
        // Keep placeholder rows
        if (row.isPlaceholder) return true;
  
        // Check if row is all blank
        const allEmpty =
          !row.plate.trim() &&
          !row.name.trim() &&
          !row.email.trim() &&
          !row.phone.trim();
  
        // If all fields are empty => remove it
        return !allEmpty;
      });
  
      return newRows;
    });
  };
  

  useEffect(() => {
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  // ------------------- FIELD CHANGES -------------------
  const handleFieldChange = (
    rowId: string,
    field: keyof VehicleRegistryEntry,
    value: string
  ) => {
    setRows((prev) => {
      let convertedIndex = -1;
      const newRows = prev.map((r, idx) => {
        if (r.vehicleId === rowId) {
          const updated = { ...r, [field]: value };
          // If it's a placeholder => user typed => convert to real row
          if (r.isPlaceholder && value.trim() !== "") {
            updated.isPlaceholder = false;
            updated.isEditing = true;
            convertedIndex = idx;
          }
          return updated;
        }
        return r;
      });
      if (convertedIndex >= 0) {
        newRows.push(createPlaceholderRow());
      }
      return newRows;
    });
    setIsDirty(true);
  };

  // ------------------- REMOVE -------------------
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

  // ------------------- SAVE -------------------
  const handleSave = () => {
    setModalType("confirmSave");
    setModalOpen(true);
  };

  const confirmSaveChanges = async () => {
    try {
      // Filter out placeholders
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

      // If turned from off->on => update the server
      if (!serverRegistryOn && turnedRegistryOn.current) {
        const lotUpdateResp = await fetch("http://localhost:5000/update-lot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lotId,
            updatedData: { registryOn: true },
          }),
        });
        if (!lotUpdateResp.ok) throw new Error("Failed to enable registry on server.");
        // Now the server is truly on
        setServerRegistryOn(true);
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

  // ------------------- UTILS -------------------
  const closeModal = () => {
    setModalOpen(false);
    setModalType(null);
    setRemovalVehicleId(null);
  };

  // ------------------- RENDER -------------------
  const workingRows = getFilteredAndSortedRows();
  const someRowIsEditing = rows.some((r) => r.isEditing);

  return (
    <div className="content">
      <div className="top-row">
        <h1>Plate Registry</h1>
        <Slider checked={registryOn} onChange={handleToggleRegistry} />
      </div>

      {/* If local slider is off => show short note. */}
      {!registryOn && (
        <p>
          Enable the Plate Registry to add license plates that will not be charged when parked in the lot.
        </p>
      )}

      {registryOn && (
        <>
          <p>
            These license plates will <strong>not</strong> be charged for parking in your lot.
            You can add them manually, upload a spreadsheet, or purchase an addon for monthly billing.
          </p>

          {/* Search, Upload, Save */}
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
              <div className="tooltip-icon-container">
                <Tooltip
                  text="Our system will parse your spreadsheet to add plates automatically."
                  position="left"
                />
              </div>
            </div>

            <button
              className="button primary"
              style={{ opacity: isDirty ? 1 : 0.6 }}
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
              {workingRows.map((row) => {
                const isRowEditing = row.isEditing;
                const fadeIcons = someRowIsEditing && !isRowEditing;

                if (row.isPlaceholder) {
                  return (
                    <tr key={row.vehicleId} className="placeholder-row">
                      <td>
                        <input
                          type="text"
                          className="placeholder-input plate-placeholder"
                          placeholder="+ Plate"
                          style={{ fontFamily: "'Oxanium', sans-serif" }}
                          value={row.plate}
                          onChange={(e) => handleFieldChange(row.vehicleId, "plate", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="placeholder-input"
                          placeholder="Name"
                          value={row.name}
                          onChange={(e) => handleFieldChange(row.vehicleId, "name", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="placeholder-input"
                          placeholder="email@address.com"
                          value={row.email}
                          onChange={(e) => handleFieldChange(row.vehicleId, "email", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="placeholder-input"
                          placeholder="000-000-0000"
                          value={row.phone}
                          onChange={(e) => handleFieldChange(row.vehicleId, "phone", e.target.value)}
                        />
                      </td>
                      <td>
                        <img
                          src="/assets/Plus.svg"
                          alt="Add row"
                          className="add-icon"
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
                          style={{ fontFamily: "'Oxanium', sans-serif" }}
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
                        <span className="ellipsis-cell">{row.name}</span>
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
                        <span className="ellipsis-cell">{row.email}</span>
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
                        <span className="ellipsis-cell">{row.phone}</span>
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

      {/* Modals */}
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
          description="Changes will not be applied unless you save before leaving. Discard them and disable the registry?"
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
