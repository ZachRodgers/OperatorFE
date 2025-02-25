import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import "./Settings.css";
import Slider from "../components/Slider";
import Modal from "../components/Modal";

const Settings: React.FC = () => {
  const { customerId, lotId } = useParams<{ customerId: string; lotId: string }>();
  const navigate = useNavigate();

  // Editable fields
  const [lotName, setLotName] = useState("My Parking Lot");
  const [companyName, setCompanyName] = useState("Parallel Parking Inc");
  const [address, setAddress] = useState("123 My Street Name");
  const [lotCapacity, setLotCapacity] = useState("43");

  // Pricing settings
  const [hourlyPrice, setHourlyPrice] = useState("");
  const [dailyMaxPrice, setDailyMaxPrice] = useState("");
  const [gracePeriod, setGracePeriod] = useState("");
  const [maxTime, setMaxTime] = useState("");
  const [ticketAmount, setTicketAmount] = useState("");

  // Toggles
  const [freeParking, setFreeParking] = useState(false);
  const [allowValidation, setAllowValidation] = useState(false);

  // State for modals
  const [modalType, setModalType] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");

  // Track if any changes were made
  const [isDirty, setIsDirty] = useState(false);
  const [saveButtonOpacity, setSaveButtonOpacity] = useState(0.3);

  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);


  useEffect(() => {
    setSaveButtonOpacity(isDirty ? 1 : 0.3);
  }, [isDirty]);

  // Open popup for Lot Settings
  const openEditPopup = (field: string, value: string) => {
    if (freeParking) {
      setModalType("freeParking");
      return;
    }
    setEditingField(field);
    setTempValue(value);
  };

  // Save popup input
  const saveEditPopup = () => {
    if (editingField) {
      if (editingField === "lotName") setLotName(tempValue);
      else if (editingField === "companyName") setCompanyName(tempValue);
      else if (editingField === "address") setAddress(tempValue);
      else if (editingField === "lotCapacity") setLotCapacity(tempValue);
    }
    setEditingField(null); // Close modal after saving
  };
  

  // Handle navigation attempts with unsaved changes
  const handleNavigation = (path: string) => {
    if (isDirty) {
      setPendingAction(() => () => navigate(path)); // ✅ Store action
      setModalType("unsavedChanges"); // ✅ Show unsaved changes modal
    } else {
      navigate(path);
    }
  };
  

  return (
    <div className="content">
      <h1>Lot Settings</h1>
      <p>Information related to the specific lot and customer that will be used for billing.</p>

      <div className={`settings-grid ${freeParking ? "disabled" : ""}`}>
        {[
          { label: "Lot Name", value: lotName, field: "lotName" },
          { label: "Company Name", value: companyName, field: "companyName" },
          { label: "Address", value: address, field: "address" },
          { label: "Lot Capacity", value: lotCapacity, field: "lotCapacity" },
        ].map(({ label, value, field }) => (
          <div className="setting-item" key={field}>
            <span className="bold">{label}:</span>
            <span>{value}</span>
            <img
              src="/assets/Edit.svg"
              alt="Edit"
              className="edit-icon"
              onClick={() => openEditPopup(field, value)}
            />
          </div>
        ))}
      </div>

      <h1>Pricing Settings</h1>
      <p>Basic settings to calculate the amount to bill guests.</p>

      <div className={`pricing-grid ${freeParking ? "disabled" : ""}`}>
      {[
  { label: "Hourly Price", value: hourlyPrice, setValue: setHourlyPrice, unit: "$ / hour" },
  { label: "Daily Maximum Price", value: dailyMaxPrice, setValue: setDailyMaxPrice, unit: "$ / day" },
  { label: "Grace Period", value: gracePeriod, setValue: setGracePeriod, unit: "mins" },
  { label: "Maximum Time", value: maxTime, setValue: setMaxTime, unit: "hours" },
  { label: "Ticket Amount", value: ticketAmount, setValue: setTicketAmount, unit: "$" },
].map(({ label, value, setValue, unit }) => (
  <div className="input-group" key={label}>
    <label className="settings-label">{label}</label>
    <div className="input-wrapper">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setIsDirty(true); // ✅ Changes here now activate "Save"
        }}
        placeholder={label === "Maximum Time" ? "none" : "0"}
      />
      <span className="input-unit">{unit}</span>
    </div>
  </div>
))}

      </div>

      <div className="toggle-container">
  {[
    { label: "Free Parking", value: freeParking, setValue: setFreeParking },
    { label: "Allow Validation", value: allowValidation, setValue: setAllowValidation },
  ].map(({ label, value, setValue }) => (
    <div className="toggle-group" key={label}>
      <span className="settings-label">{label}</span>
      <Slider
        checked={value}
        onChange={() => {
          setValue(!value);
          setIsDirty(true); // ✅ Changing toggles now requires clicking "Save"
        }}
      />
    </div>
  ))}
</div>


      <div className="button-group">
      <button
  className="button primary"
  style={{ opacity: saveButtonOpacity }}
  disabled={!isDirty}
  onClick={() => {
    if (freeParking) {
      setModalType("confirmFreeParking"); // ✅ Trigger the free parking modal
    } else {
      setModalType("confirmSave"); // ✅ Normal save confirmation
    }
  }}
>
  Save
</button>

        <button className="button secondary" onClick={() => handleNavigation(`/${customerId}/${lotId}/advanced`)}>
          Advanced Settings
        </button>
        <button className="button secondary" onClick={() => handleNavigation(`/${customerId}/${lotId}/registry`)}>
          Plate Registry
        </button>
      </div>

      {/* Modals */}
      {modalType === "confirmSave" && (
        <Modal
          isOpen={true}
          title="Please confirm you want to make these changes now."
          description="By continuing, you acknowledge that this change is being recorded in case of disputes."
          confirmText="Update Settings"
          cancelText="Return"
          onConfirm={() => {
            setModalType(null);
            setIsDirty(false);
          }}
          onCancel={() => setModalType(null)}
        />
      )}

      {modalType === "unsavedChanges" && (
        <Modal
          isOpen={true}
          title="You have unsaved changes!"
          description="The changes you made will not be applied unless you save before switching to another page."
          confirmText="Take me back!"
          cancelText="Continue Anyway"
          onConfirm={() => setModalType(null)}
          onCancel={() => {
            if (pendingAction) {
              pendingAction(); // ✅ Execute stored action
              setPendingAction(null); // ✅ Clear the stored action
            }
            setModalType(null);
          }}
          
        />
      )}

{modalType === "confirmFreeParking" && (
  <Modal
    isOpen={true}
    title="Please confirm you want to make these changes now."
    description="You are in free parking mode. Parked cars will not be billed."
    confirmText="Update Settings"
    cancelText="Return"
    onConfirm={() => {
      setModalType(null);
      setIsDirty(false);
    }}
    onCancel={() => setModalType(null)}
  />
)}


      {/* Lot Settings Edit Popup (Fixed Input Field) */}
      {editingField && (
  <Modal
    isOpen={true}
    title={`Edit ${editingField}`}
    description=""
    confirmText="Save"
    cancelText="Cancel"
    onConfirm={saveEditPopup}
    onCancel={() => setEditingField(null)}
  >
    <input
      type="text"
      value={tempValue}
      onChange={(e) => setTempValue(e.target.value)}
      className="popup-input"
    />
  </Modal>
)}


    </div>
  );
};

export default Settings;
