import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import Modal from "../components/Modal";
import Slider from "../components/Slider";
import Tooltip from "../components/Tooltip";
import { lotService, registryService } from "../utils/api";
import "./PlateRegistry.css";

interface VehicleRegistryEntry {
  lotId: string;
  vehicleId: string;
  plateNumber: string;
  name: string;
  email: string;
  phone: string;
  registryId?: string; // Only present for saved entries
}

export interface RegistryRow extends VehicleRegistryEntry {
  isPlaceholder?: boolean; // "Add new" row
  isEditing?: boolean;     // row-level edit mode
  isTemporary?: boolean;   // New entry not yet saved
}

type ModalType =
  | "disableRegistry"
  | "unsavedChanges"
  | "removeVehicle"
  | "confirmSave"
  | null;

const PlateRegistry: React.FC = () => {
  const { lotId } = useParams<{ lotId: string }>();

  // Server registry state
  const [serverRegistryOn, setServerRegistryOn] = useState<boolean>(false);
  // Local slider state
  const [registryOn, setRegistryOn] = useState<boolean>(false);
  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // Table rows state
  const [rows, setRows] = useState<RegistryRow[]>([]);
  // Sorting/searching state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"plate" | "name" | "email" | "phone">("plate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  // Unsaved changes flag
  const [isDirty, setIsDirty] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [removalVehicleId, setRemovalVehicleId] = useState<string | null>(null);

  // Track if user toggled from off -> on
  const turnedRegistryOn = useRef(false);

  // On mount: load table data, registry status, and add a placeholder row
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        if (lotId) {
          const status = await lotService.getRegistryStatus(lotId);
          setServerRegistryOn(status);
          setRegistryOn(status);

          // Initialize with just the placeholder row
          setRows([createPlaceholderRow()]);

          try {
            // Try to load registry entries from the server
            const entries = await registryService.getRegistryByLot(lotId);
            if (entries && entries.length > 0) {
              const realRows: RegistryRow[] = entries.map((entry: any) => ({
                ...entry,
                vehicleId: entry.registryId, // Use registryId as vehicleId for saved entries
                registryId: entry.registryId, // Explicitly set registryId
                isPlaceholder: false,
                isEditing: false,
                isTemporary: false
              }));
              realRows.sort((a, b) => a.plateNumber.localeCompare(b.plateNumber));
              // Add the placeholder row at the end
              realRows.push(createPlaceholderRow());
              setRows(realRows);
            }
          } catch (error) {
            console.error("Error loading registry entries:", error);
            // Keep the placeholder row even if loading fails
            setRows([createPlaceholderRow()]);
          }
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        // Ensure we at least have the placeholder row
        setRows([createPlaceholderRow()]);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [lotId]);

  /** Create a fresh placeholder row */
  function createPlaceholderRow(): RegistryRow {
    return {
      lotId: lotId || "",
      vehicleId: `TEMP_${Math.floor(Math.random() * 100000)}`,
      registryId: undefined, // Explicitly set to undefined for new entries
      plateNumber: "",
      name: "",
      email: "",
      phone: "",
      isPlaceholder: true,
      isEditing: false,
      isTemporary: true
    };
  }

  // ------------------- REGISTRY TOGGLE -------------------
  const handleToggleRegistry = async () => {
    if (!registryOn) {
      if (!serverRegistryOn) {
        try {
          await lotService.enableRegistry(lotId!);
          setServerRegistryOn(true);
          setIsDirty(true);
        } catch (error) {
          console.error("Error enabling registry:", error);
          alert("Failed to enable registry. Please try again.");
          return;
        }
      }
      setRegistryOn(true);
    } else {
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
    try {
      await lotService.disableRegistry(lotId!);
      setServerRegistryOn(false);
      setRegistryOn(false);
      setIsDirty(false);
      turnedRegistryOn.current = false;
      closeModal();
    } catch (error) {
      console.error("Error disabling registry:", error);
      alert("Error disabling registry. Please try again.");
      closeModal();
    }
  };

  const confirmDiscardChanges = async () => {
    await confirmDisableRegistry();
    closeModal();
  };

  // ------------------- SORT + SEARCH -------------------
  const getFilteredAndSortedRows = (): RegistryRow[] => {
    let working = [...rows];

    // Always keep the placeholder row
    const placeholderRow = working.find(r => r.isPlaceholder);
    working = working.filter(r => !r.isPlaceholder);

    // Filter out non-placeholder rows if registry is off
    if (!registryOn) {
      working = working.filter((r) => !r.isPlaceholder);
    }

    // Apply search filter
    working = working.filter((r) => {
      const str = `${r.plateNumber} ${r.name} ${r.email} ${r.phone}`.toLowerCase();
      return str.includes(searchQuery.toLowerCase());
    });

    // Sort non-placeholder rows
    working.sort((a, b) => {
      let valA = "";
      let valB = "";
      if (sortBy === "plate") {
        valA = a.plateNumber;
        valB = b.plateNumber;
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

    // Always add the placeholder row at the top
    if (placeholderRow) {
      working.unshift(placeholderRow);
    } else {
      // If no placeholder row exists, create one
      working.unshift(createPlaceholderRow());
    }

    return working;
  };

  const handleSort = (col: "plate" | "name" | "email" | "phone") => {
    setSortOrder(sortBy === col && sortOrder === "asc" ? "desc" : "asc");
    setSortBy(col);
  };

  // ------------------- EDIT MODE -------------------
  // Toggle editing state for a row
  const toggleEditRow = (vehicleId: string) => {
    setRows((prev) =>
      prev
        .map((row) => {
          if (row.vehicleId === vehicleId) {
            if (row.isEditing) {
              // If turning off edit, remove the row if all fields are empty (and not a placeholder)
              const allEmpty =
                !row.plateNumber.trim() &&
                !row.name.trim() &&
                !row.email.trim() &&
                !row.phone.trim();
              if (allEmpty && !row.isPlaceholder) {
                return { ...row, isEditing: false, vehicleId: "TO_BE_REMOVED" };
              }
              return { ...row, isEditing: false };
            } else {
              return { ...row, isEditing: true };
            }
          }
          return { ...row, isEditing: false };
        })
        .filter((r) => r.vehicleId !== "TO_BE_REMOVED")
    );
  };

  const handleGlobalClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(".registry-input") ||
      target.closest(".plate-input") ||
      target.closest(".edit-icon2") ||
      target.closest(".remove-icon") ||
      target.closest(".placeholder-input")
    ) {
      return;
    }
    setRows((prev) => {
      let newRows = prev.map((row) =>
        row.isPlaceholder ? row : { ...row, isEditing: false }
      );
      newRows = newRows.filter((row) => {
        if (row.isPlaceholder) return true;
        const allEmpty =
          !row.plateNumber.trim() &&
          !row.name.trim() &&
          !row.email.trim() &&
          !row.phone.trim();
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
    setRows((prev) =>
      prev.map((r) => {
        if (r.vehicleId === rowId) {
          const updated = { ...r, [field]: value };
          if (r.isPlaceholder && value.trim() !== "") {
            // When placeholder row gets content, convert it to a temporary edit row
            updated.isPlaceholder = false;
            updated.isEditing = true;
            updated.isTemporary = true;
          }
          return updated;
        }
        return r;
      })
    );
    setIsDirty(true);
  };

  // ------------------- REMOVE -------------------
  const handleRemoveRow = (vehicleId: string) => {
    setRemovalVehicleId(vehicleId);
    setModalType("removeVehicle");
    setModalOpen(true);
  };

  const confirmRemoveVehicle = async () => {
    if (removalVehicleId) {
      const row = rows.find(r => r.vehicleId === removalVehicleId);
      if (row) {
        if (row.registryId) {
          // If it's a saved entry, delete it from the server
          try {
            await registryService.deleteRegistryEntry(row.registryId);
          } catch (error) {
            console.error("Error deleting registry entry:", error);
            alert("Failed to delete entry. Please try again.");
            return;
          }
        }
        // Remove from local state
        setRows((prev) => prev.filter((r) => r.vehicleId !== removalVehicleId));
        setIsDirty(true);
      }
    }
    closeModal();
  };

  // ------------------- SAVE -------------------
  // Validation functions
  const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);
  const isValidPhone = (phone: string) => phone.replace(/\D/g, "").length >= 7;

  const handleSave = () => {
    setModalType("confirmSave");
    setModalOpen(true);
  };

  const confirmSaveChanges = async () => {
    try {
      // Validate all non-placeholder rows
      for (const row of rows.filter((r) => !r.isPlaceholder)) {
        if (!isValidEmail(row.email)) {
          alert(`Invalid email address in row with plate "${row.plateNumber}"`);
          return;
        }
        if (!isValidPhone(row.phone)) {
          alert(`Invalid phone number in row with plate "${row.plateNumber}"`);
          return;
        }
      }

      // Process each row
      for (const row of rows.filter((r) => !r.isPlaceholder)) {
        const entry = {
          lotId: row.lotId,
          plateNumber: row.plateNumber.toUpperCase(), // Match the DTO field name and ensure uppercase
          name: row.name.trim(),
          email: row.email.trim(),
          phone: row.phone.trim()
        };

        try {
          if (row.registryId) {
            // Update existing entry
            await registryService.updateRegistryEntry(row.registryId, entry);
          } else {
            // For new entries, try to find if plate exists
            const existingEntries = await registryService.getRegistryByLot(row.lotId);
            const existingEntry = existingEntries.find((e: VehicleRegistryEntry) => e.plateNumber === row.plateNumber);

            if (existingEntry) {
              // If plate exists, update the existing entry
              await registryService.updateRegistryEntry(existingEntry.registryId, entry);
            } else {
              // Create new entry only if plate doesn't exist
              await registryService.createRegistryEntry(entry);
            }
          }
        } catch (error: any) {
          console.error("Error processing row:", error);
          throw error; // Re-throw to be caught by outer try-catch
        }
      }

      // Reload the data from the server
      const entries = await registryService.getRegistryByLot(lotId!);
      const realRows: RegistryRow[] = entries.map((entry: any) => ({
        ...entry,
        vehicleId: entry.registryId,
        isPlaceholder: false,
        isEditing: false,
        isTemporary: false
      }));
      realRows.sort((a, b) => a.plateNumber.localeCompare(b.plateNumber));
      realRows.push(createPlaceholderRow());
      setRows(realRows);

      setIsDirty(false);
      turnedRegistryOn.current = false;
      closeModal();
    } catch (error: any) {
      console.error("Error saving changes:", error);
      // Show more specific error message if available
      const errorMessage = error.response?.data?.message || "Error saving changes. Please try again.";
      alert(errorMessage);
      closeModal();
    }
  };

  // ------------------- UTILS -------------------
  const closeModal = () => {
    setModalOpen(false);
    setModalType(null);
    setRemovalVehicleId(null);
  };

  const workingRows = getFilteredAndSortedRows();
  const someRowIsEditing = rows.some((r) => r.isEditing);

  if (isLoading) {
    return <div className="content">Loading...</div>;
  }

  return (
    <div className="content">
      <div className="top-row">
        <h1>Plate Registry</h1>
        <Slider checked={registryOn} onChange={handleToggleRegistry} />
      </div>

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

          <table className="registry-table">
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
                  onClick={() => handleSort("name")}
                  className={`sortable-column ${sortBy === "name" ? "active" : ""}`}
                >
                  Name
                  <img
                    src={`/assets/${sortBy === "name" ? "SortArrowSelected.svg" : "SortArrow.svg"
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
                    src={`/assets/${sortBy === "email" ? "SortArrowSelected.svg" : "SortArrow.svg"
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
                    src={`/assets/${sortBy === "phone" ? "SortArrowSelected.svg" : "SortArrow.svg"
                      }`}
                    alt="Sort"
                    className={`sort-arrow ${sortOrder}`}
                  />
                </th>
                <th className="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workingRows.map((row) =>
                row.isPlaceholder ? (
                  <tr key={row.vehicleId} className="placeholder-row">
                    <td>
                      <input
                        type="text"
                        className="placeholder-input plate-placeholder"
                        placeholder="+ Plate"
                        style={{ fontFamily: "'Oxanium', sans-serif" }}
                        value={row.plateNumber}
                        onChange={(e) => handleFieldChange(row.vehicleId, "plateNumber", e.target.value)}
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
                      <img src="/assets/Plus.svg" alt="Add row" className="add-icon" />
                    </td>
                  </tr>
                ) : (
                  <tr key={row.vehicleId}>
                    <td>
                      {row.isEditing ? (
                        <input
                          type="text"
                          className="registry-input"
                          value={row.plateNumber}
                          onChange={(e) => handleFieldChange(row.vehicleId, "plateNumber", e.target.value)}
                          style={{ fontFamily: "'Oxanium', sans-serif" }}
                        />
                      ) : (
                        <div className="plate-badge-reg">{row.plateNumber}</div>
                      )}
                    </td>
                    <td>
                      {row.isEditing ? (
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
                      {row.isEditing ? (
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
                      {row.isEditing ? (
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
                        className={`edit-icon2 ${!row.isEditing ? "" : ""}`}
                        onClick={() => toggleEditRow(row.vehicleId)}
                      />
                      <img
                        src="/assets/Minus.svg"
                        alt="Remove entry"
                        className="remove-icon"
                        onClick={() => handleRemoveRow(row.vehicleId)}
                      />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </>
      )}

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
