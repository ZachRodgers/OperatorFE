import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import "./Settings.css";
import Slider from "../components/Slider";
import Modal from "../components/Modal";
import Tooltip from "../components/Tooltip";
import lots from "../data/lots_master.json"; // Import lot data
import lotPricing from "../data/lot_pricing.json"; // Import lot pricing data


const Settings: React.FC = () => {
  const { customerId, lotId } = useParams<{ customerId: string; lotId: string }>();
  const navigate = useNavigate();

// Find the lot by lotId
const lot = lots.find((lot) => lot.lotId === lotId);
// Find the lot pricing entry for the current lotId
const pricing = lotPricing.find((entry) => entry.lotId === lotId);


// Default values from the JSON (fallback if undefined)
const [lotName, setLotName] = useState(lot?.lotName || "Unknown Lot");
const [companyName, setCompanyName] = useState(lot?.companyName || "Unknown Company");
const [address, setAddress] = useState(lot?.address || "Unknown Address");
const [lotCapacity, setLotCapacity] = useState(String(lot?.lotCapacity ?? "0"));


  // Pricing settings
  const [hourlyPrice, setHourlyPrice] = useState(
    pricing?.hourlyRate !== undefined ? String(pricing.hourlyRate) : ""
  );
  const [dailyMaxPrice, setDailyMaxPrice] = useState(
    pricing?.maximumAmount !== undefined ? String(pricing.maximumAmount) : ""
  );
  const [gracePeriod, setGracePeriod] = useState(
    pricing?.gracePeriod !== undefined ? String(pricing.gracePeriod) : ""
  );
  const [maxTime, setMaxTime] = useState(
    pricing?.maximumTime !== undefined ? String(pricing.maximumTime) : ""
  );
  const [ticketAmount, setTicketAmount] = useState(
    pricing?.ticketAmount !== undefined ? String(pricing.ticketAmount) : ""
  );
  

  
  // Toggles
  const [freeParking, setFreeParking] = useState(pricing?.freeParking ?? false);
  const [allowValidation, setAllowValidation] = useState(pricing?.allowValidation ?? false);
  

  // State for modals
  const [modalType, setModalType] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");

  // Track if any changes were made
  const [isDirty, setIsDirty] = useState(false);
  const [saveButtonOpacity, setSaveButtonOpacity] = useState(0.3);

  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const [gracePeriodError, setGracePeriodError] = useState(false);
const [maxTimeError, setMaxTimeError] = useState(false);

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

  const saveEditPopup = async () => {
    if (!editingField) return;
  
    const updatedField = { [editingField]: tempValue };
  
    try {
      console.log("📡 Sending update-lot request:", updatedField);
  
      // Update local state first (ensures UI update)
      switch (editingField) {
        case "lotName":
          setLotName(tempValue);
          break;
        case "companyName":
          setCompanyName(tempValue);
          break;
        case "address":
          setAddress(tempValue);
          break;
        case "lotCapacity":
          setLotCapacity(tempValue);
          break;
        default:
          break;
      }
  
      const response = await fetch("http://localhost:5000/update-lot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotId,
          updatedData: updatedField,
        }),
      });
  
      if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Failed to update: ${errorMessage}`);
      }
  
      console.log("Successfully updated, fetching latest data...");
  
      // Fetch latest data after update
      setTimeout(async () => {
        const updatedResponse = await fetch("http://localhost:5000/get-customer");
        const updatedCustomers = await updatedResponse.json();
  
        const updatedLot = updatedCustomers.find((lot: { lotId: string }) => lot.lotId === lotId);
  
        if (updatedLot) {
          console.log("Updated Lot Data from Backend:", updatedLot);
          setLotName(updatedLot.lotName);
          setCompanyName(updatedLot.companyName);
          setAddress(updatedLot.address);
          setLotCapacity(String(updatedLot.lotCapacity ?? "0"));
        }
      }, 500); // Small delay to ensure backend writes data
  
      setEditingField(null);
      setModalType(null);
      setIsDirty(false);
    } catch (error) {
      console.error("❌ Error updating lot:", error);
      alert("Failed to update lot settings.");
    }
  };
  
  
  
  
  
  const handleSaveSettings = async () => {
    const isMaxTimeEmpty = maxTime.trim() === ""; // Check if Max Time is blank
  
    const updatedPricing = {
      lotId,
      hourlyRate: hourlyPrice.trim() === "" ? "" : parseFloat(hourlyPrice) || "", 
      maximumAmount: dailyMaxPrice.trim() === "" ? "" : parseFloat(dailyMaxPrice) || "", 
      gracePeriod: gracePeriod.trim() === "" ? "10" : Math.max(parseInt(gracePeriod), 10), // Ensure minimum 10
      maximumTime: isMaxTimeEmpty ? "" : Math.max(parseInt(maxTime), 1), // Ensure minimum 1, allow blank
      ticketAmount: isMaxTimeEmpty ? "" : ticketAmount.trim() === "" ? "" : parseFloat(ticketAmount) || "", // ✅ Reset Ticket Amount if Max Time is blank
      freeParking, // ✅ Always include toggle values
      allowValidation, // ✅ Always include toggle values
      availableSlots: 0,
      mondayPricing: [],
      tuesdayPricing: [],
      wednesdayPricing: [],
      thursdayPricing: [],
      fridayPricing: [],
      saturdayPricing: [],
      sundayPricing: [],
      modifiedBy: "", 
      modifiedOn: new Date().toISOString(), 
    };
  
    try {
      const response = await fetch("http://localhost:5000/update-lot-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPricing),
      });
  
      if (!response.ok) {
        throw new Error("Failed to update lot pricing.");
      }
  
      setIsDirty(false);
      alert("Lot pricing updated successfully.");
    } catch (error) {
      console.error("Error updating lot pricing:", error);
      alert("Failed to update pricing settings.");
    }
  };
  
  
  
  

  // Handle navigation attempts with unsaved changes
  const handleNavigation = (path: string) => {
    if (isDirty) {
      setPendingAction(() => () => navigate(path)); 
      setModalType("unsavedChanges"); 
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
              onClick={() => {
                if (freeParking) {
                  setModalType("freeParking");
                } else {
                  openEditPopup(field, value);
                }
              }}
                          />
          </div>
        ))}
      </div>

      <h1>Pricing Settings</h1>
      <p>Basic settings to calculate the amount to bill guests.</p>

      <div className="pricing-grid" style={{ opacity: freeParking ? 0.5 : 1 }}>
  {[

  { label: "Hourly Price", value: hourlyPrice, setValue: setHourlyPrice, unit: "$ / hour" },
  { label: "Daily Maximum Price", value: dailyMaxPrice, setValue: setDailyMaxPrice, unit: "$ / day" },
  { 
    label: "Grace Period", 
    value: gracePeriod, 
    setValue: setGracePeriod, 
    unit: "mins", 
    tooltip: "Time in lot before a car is charged. Minimum: 10 minutes.",
    placeholder: "10"
  },
  {
    label: "Maximum Time",
    value: maxTime,
    setValue: (val: string) => {
      const newValue = val === "0" || val.toLowerCase() === "none" ? "" : val;
      setMaxTime(newValue);
      setIsDirty(true);
    },
    unit: "hours",
    tooltip: "Time before issuing a ticket or alerting management. Minimum: 1 hour.",
    placeholder: "none"
  },
  {
    label: "Ticket Amount",
    value: ticketAmount,
    setValue: setTicketAmount,
    unit: "$",
    tooltip: "Once a vehicle exceeds Maximum Time, a ticket is automatically issued.",
    disabled: maxTime.trim() === "" // Disable if Max Time is blank
  }
].map(({ label, value, setValue, unit, tooltip, placeholder, disabled }) => (
  <div className="input-group" key={label} style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto" }}>
    <label className="settings-label">
      {label} {tooltip && <Tooltip text={tooltip} />}
    </label>
    <div className="input-wrapper">
      <input
        type="number"
        min="0"
        value={disabled ? "" : value} // Clear input when faded out
        onChange={(e) => {
          const newValue = e.target.value.replace(/[^0-9]/g, ""); // Allow only numbers
          
          if (label === "Grace Period") {
            setGracePeriod(newValue);
            setGracePeriodError(parseInt(newValue) < 10); // Show error if less than 10
          } else if (label === "Maximum Time") {
            setMaxTime(newValue);
            setMaxTimeError(parseInt(newValue) < 1); // Show error if less than 1
          } else if (!disabled) {
            setValue(newValue); // Update field only if NOT disabled
          }

          setIsDirty(true);
        }}
        onInput={(e) => {
          const target = e.target as HTMLInputElement;
          target.value = target.value.replace(/[^0-9]/g, ""); 
        }}
        placeholder={disabled ? "0" : value === "" ? placeholder || "0" : ""}
        disabled={disabled} // Disable input if Ticket Amount is faded
      />
      <span className="input-unit">{unit}</span>
    </div>
  </div>
))}

</div>


<div className="toggle-container">
{[
  { label: "Free Parking", value: freeParking, setValue: setFreeParking, disableOnFreeParking: false },
  { label: "Allow Validation", value: allowValidation, setValue: setAllowValidation, disableOnFreeParking: true, tooltip: "Allows operators to validate vehicles manually and lets users request validation via the app." },
].map(({ label, value, setValue, disableOnFreeParking, tooltip }) => (
  <div 
    className="toggle-group" 
    key={label} 
    style={{ opacity: freeParking && disableOnFreeParking ? 0.5 : 1, pointerEvents: freeParking && disableOnFreeParking ? "none" : "auto" }}
  >
    <span className="settings-label">
      {label} {tooltip && <Tooltip text={tooltip} />}
    </span>
    <Slider
      checked={value}
      onChange={() => {
        setValue(!value);
        setIsDirty(true);
      }}
    />
  </div>
))}

</div>

{/*  Place the message outside of the toggle-container to appear below */}
{freeParking && (
  <p className="free-parking-message">
    <em>When free parking is turned on, the cameras will still record data and be running; however, billing will be disabled for your lot until turned back on.</em>
  </p>
)}


      <div className="button-group">
      <button
  className="button primary"
  style={{ opacity: !gracePeriodError && !maxTimeError && isDirty ? 1 : 0.3 }}
  disabled={gracePeriodError || maxTimeError || !isDirty} //  Disable if error exists
  onClick={() => {
    if (freeParking) {
      setModalType("confirmFreeParking");
    } else {
      setModalType("confirmSave");
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
      {(gracePeriodError || maxTimeError) && (
  <p className="error-message">
    {gracePeriodError && "Grace Period must be greater than 10 minutes."}
    {maxTimeError && <br />} {/* Line break if both errors exist */}
    {maxTimeError && "Maximum time must be at least 1 hour."}
  </p>
)}

      {/* Modals */}
      {modalType === "confirmSave" && (
        <Modal
          isOpen={true}
          title="Confirm Changes"
          description="By continuing, you acknowledge that you are not misinforming your customers of pricing and that this change is being recorded in case of disputes. Current parked vehicles will not be affected by these changes."
          confirmText="Update Settings"
          cancelText="Return"
          onConfirm={() => {
            handleSaveSettings();
            setModalType(null);
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
              pendingAction(); //  Execute stored action
              setPendingAction(null); //  Clear the stored action
            }
            setModalType(null);
          }}
          
        />
      )}

{modalType === "confirmFreeParking" && (
  <Modal
    isOpen={true}
    title="Free Parking is Enabled"
    description="You are in free parking mode. Parked cars will not be billed."
    confirmText="Confirm Settings"
    cancelText="Return"
    onConfirm={() => {
      handleSaveSettings();
      setModalType(null);
    }}            
    onCancel={() => setModalType(null)}
  />
)}


      {/* Lot Settings Edit Popup (Fixed Input Field) */}
      {editingField && (
  <Modal
    isOpen={true}
    title={`Edit ${editingField}`}
    description="Please confirm you would like to update this setting, once completed this action cannot be undone."
    confirmText="Update Settings"
    cancelText="Cancel"
    onConfirm={() => {
      saveEditPopup(); 
      setEditingField(null); // Ensure modal closes
    }}
    onCancel={() => setEditingField(null)}
  >
    <input
      type={editingField === "lotCapacity" ? "number" : "text"}
      min="0"
      value={tempValue}
      onChange={(e) => {
        let newValue = e.target.value;

        if (editingField === "lotCapacity") {
          newValue = newValue.replace(/[^0-9]/g, ""); // Only allow numbers
        }

        setTempValue(newValue);
      }}
      className="popup-input"
    />
  </Modal>
)}



    </div>
  );
};

export default Settings;
