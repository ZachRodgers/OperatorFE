import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./AdvancedSettings.css";
import Slider from "../components/Slider";
import Modal from "../components/Modal";
import lotPricingData from "../data/lot_pricing.json";

type BlockMode = "default" | "allDay" | "setTime" | "newBlock";

interface Block {
  mode: BlockMode;
  startTime?: string;
  endTime?: string;
  customRate?: string;
  customMax?: string;
}

type DayData = [Block, Block, Block];

const dayLabels = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// ---------------- HELPER FUNCTIONS -----------------

function parseDayPricing(
  dayPricing: any[],
  globalRate: string,
  globalMax: string
): DayData {
  if (!dayPricing || dayPricing.length === 0) {
    return [
      { mode: "default", customRate: globalRate, customMax: globalMax },
      { mode: "newBlock" },
      { mode: "newBlock" },
    ];
  }

  const blocks: Block[] = [];
  for (let i = 0; i < dayPricing.length && i < 3; i++) {
    const entry = dayPricing[i];
    if (entry.startTime && entry.endTime) {
      blocks.push({
        mode: "setTime",
        startTime: entry.startTime,
        endTime: entry.endTime,
        customRate: entry.hourlyRate || "",
        customMax: entry.maximumAmount || "",
      });
    } else {
      // If no start/end => either "default" or "allDay"
      if (entry.isDefault) {
        blocks.push({
          mode: "default",
          customRate: globalRate,
          customMax: globalMax,
        });
      } else {
        blocks.push({
          mode: "allDay",
          customRate: entry.hourlyRate || globalRate,
          customMax: entry.maximumAmount || globalMax,
        });
      }
    }
  }

  while (blocks.length < 3) {
    blocks.push({ mode: "newBlock" });
  }

  return blocks as DayData;
}

function buildDayPricing(blocks: DayData, globalRate: string, globalMax: string): any[] {
  const dayPricing: any[] = [];
  blocks.forEach((block) => {
    if (block.mode === "newBlock") return;
    if (block.mode === "setTime") {
      dayPricing.push({
        startTime: block.startTime || "00:00",
        endTime: block.endTime || "23:59",
        hourlyRate: block.customRate ?? "",
        maximumAmount: block.customMax ?? "",
      });
    } else if (block.mode === "allDay") {
      dayPricing.push({
        startTime: "00:00",
        endTime: "23:59",
        hourlyRate: block.customRate ?? globalRate,
        maximumAmount: block.customMax ?? globalMax,
      });
    } else if (block.mode === "default") {
      dayPricing.push({
        startTime: "00:00",
        endTime: "23:59",
        hourlyRate: block.customRate ?? globalRate,
        maximumAmount: block.customMax ?? globalMax,
        isDefault: true,
      });
    }
  });
  return dayPricing;
}

// ---------------- COMPONENT -----------------

const AdvancedSettings: React.FC = () => {
  // Extract lotId from route
  const { customerId, lotId } = useParams<{ customerId: string; lotId: string }>();
  const navigate = useNavigate();

  // Find matching pricing entry
  const pricing = lotPricingData.find((entry) => entry.lotId === lotId);
  const globalRate = pricing?.hourlyRate !== undefined ? String(pricing.hourlyRate) : "";
  const globalMax = pricing?.maximumAmount !== undefined ? String(pricing.maximumAmount) : "";

  // Parse existing day arrays into block structures
  const [mondayBlocks, setMondayBlocks] = useState<DayData>(() =>
    parseDayPricing(pricing?.mondayPricing ?? [], globalRate, globalMax)
  );
  const [tuesdayBlocks, setTuesdayBlocks] = useState<DayData>(() =>
    parseDayPricing(pricing?.tuesdayPricing ?? [], globalRate, globalMax)
  );
  const [wednesdayBlocks, setWednesdayBlocks] = useState<DayData>(() =>
    parseDayPricing(pricing?.wednesdayPricing ?? [], globalRate, globalMax)
  );
  const [thursdayBlocks, setThursdayBlocks] = useState<DayData>(() =>
    parseDayPricing(pricing?.thursdayPricing ?? [], globalRate, globalMax)
  );
  const [fridayBlocks, setFridayBlocks] = useState<DayData>(() =>
    parseDayPricing(pricing?.fridayPricing ?? [], globalRate, globalMax)
  );
  const [saturdayBlocks, setSaturdayBlocks] = useState<DayData>(() =>
    parseDayPricing(pricing?.saturdayPricing ?? [], globalRate, globalMax)
  );
  const [sundayBlocks, setSundayBlocks] = useState<DayData>(() =>
    parseDayPricing(pricing?.sundayPricing ?? [], globalRate, globalMax)
  );

  const dayStates = [
    { label: "Monday", blocks: mondayBlocks, setter: setMondayBlocks },
    { label: "Tuesday", blocks: tuesdayBlocks, setter: setTuesdayBlocks },
    { label: "Wednesday", blocks: wednesdayBlocks, setter: setWednesdayBlocks },
    { label: "Thursday", blocks: thursdayBlocks, setter: setThursdayBlocks },
    { label: "Friday", blocks: fridayBlocks, setter: setFridayBlocks },
    { label: "Saturday", blocks: saturdayBlocks, setter: setSaturdayBlocks },
    { label: "Sunday", blocks: sundayBlocks, setter: setSundayBlocks },
  ];

  // Figure out if advanced is initially enabled
  const [advancedEnabled, setAdvancedEnabled] = useState(() => {
    // check if there's any allDay or setTime block
    return dayStates.some((day) => day.blocks.some((b) => b.mode === "allDay" || b.mode === "setTime"));
  });

  // Track unsaved changes
  const [isDirty, setIsDirty] = useState(false);

  // Modal control
  type ModalType = null | "disableAdvanced" | "confirmSave" | "unsavedChanges";
  const [modalType, setModalType] = useState<ModalType>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // ---------------- HANDLERS ----------------

  // Toggling the slider
  const handleToggleAdvanced = () => {
    if (!advancedEnabled) {
      // was OFF => now ON
      setAdvancedEnabled(true);
      setIsDirty(true);
    } else {
      // was ON => user wants to disable
      setModalType("disableAdvanced");
    }
  };

  // "Yes, disable advanced settings"
  const confirmDisableAdvanced = async () => {
    try {
      // 1) Locally reset each day's blocks
      dayStates.forEach((day) => {
        day.setter([
          { mode: "default", customRate: globalRate, customMax: globalMax },
          { mode: "newBlock" },
          { mode: "newBlock" },
        ]);
      });

      // 2) Flip slider OFF so it visually shows "disabled" and hides the grid
      setAdvancedEnabled(false);

      // 3) Build a pricing object with empty arrays to POST
      const updatedPricing = {
        lotId,
        hourlyRate: pricing?.hourlyRate ?? "",
        maximumAmount: pricing?.maximumAmount ?? "",
        gracePeriod: pricing?.gracePeriod ?? "",
        maximumTime: pricing?.maximumTime ?? "",
        ticketAmount: pricing?.ticketAmount ?? "",
        freeParking: pricing?.freeParking ?? false,
        allowValidation: pricing?.allowValidation ?? false,
        availableSlots: pricing?.availableSlots ?? 0,
        modifiedBy: "",
        modifiedOn: new Date().toISOString(),
        mondayPricing: [],
        tuesdayPricing: [],
        wednesdayPricing: [],
        thursdayPricing: [],
        fridayPricing: [],
        saturdayPricing: [],
        sundayPricing: [],
      };

      // 4) Immediately POST to server
      const resp = await fetch("http://localhost:5000/update-lot-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPricing),
      });

      if (!resp.ok) {
        throw new Error("Failed to disable advanced settings on server.");
      }

      // 5) Mark as not dirty
      setIsDirty(false);

    } catch (error) {
      console.error("Error disabling advanced settings:", error);
      alert("Failed to disable advanced settings.");
    }
  };

  // "Save" => show confirm modal
  const handleSaveClick = () => {
    setModalType("confirmSave");
  };

  // Actually do the save once confirmed
  const doSave = async () => {
    const updatedPricing = {
      lotId,
      hourlyRate: pricing?.hourlyRate ?? "",
      maximumAmount: pricing?.maximumAmount ?? "",
      gracePeriod: pricing?.gracePeriod ?? "",
      maximumTime: pricing?.maximumTime ?? "",
      ticketAmount: pricing?.ticketAmount ?? "",
      freeParking: pricing?.freeParking ?? false,
      allowValidation: pricing?.allowValidation ?? false,
      availableSlots: pricing?.availableSlots ?? 0,
      modifiedBy: "",
      modifiedOn: new Date().toISOString(),
      mondayPricing: buildDayPricing(mondayBlocks, globalRate, globalMax),
      tuesdayPricing: buildDayPricing(tuesdayBlocks, globalRate, globalMax),
      wednesdayPricing: buildDayPricing(wednesdayBlocks, globalRate, globalMax),
      thursdayPricing: buildDayPricing(thursdayBlocks, globalRate, globalMax),
      fridayPricing: buildDayPricing(fridayBlocks, globalRate, globalMax),
      saturdayPricing: buildDayPricing(saturdayBlocks, globalRate, globalMax),
      sundayPricing: buildDayPricing(sundayBlocks, globalRate, globalMax),
    };

    try {
      const resp = await fetch("http://localhost:5000/update-lot-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPricing),
      });
      if (!resp.ok) {
        throw new Error("Failed to update advanced settings.");
      }
      setIsDirty(false);
      setModalType(null); // Close the modal
    } catch (error) {
      console.error("Error updating advanced settings:", error);
      alert("Failed to update advanced settings.");
      setModalType(null);
    }
  };

  // Navigate away (check unsaved changes)
  const handleNavigation = (path: string) => {
    if (isDirty) {
      setPendingAction(() => () => navigate(path));
      setModalType("unsavedChanges");
    } else {
      navigate(path);
    }
  };

  // "General Settings" button
  const handleGeneralSettings = () => {
    if (customerId && lotId) {
      handleNavigation(`/${customerId}/${lotId}/settings`);
    } else {
      alert("No lot selected!");
    }
  };

  // ---------------- RENDER HELPERS ----------------

  // We’ll rename the dropdown labels to "Default", "All Day", "Set Time"
  const modeLabelMap: Record<BlockMode, string> = {
    default: "Default",
    allDay: "All Day",
    setTime: "Set Time",
    newBlock: "New Time Block", // not used in the dropdown
  };

  const renderBlockDropdown = (
    block: Block,
    rowIndex: number,
    blocks: DayData,
    setBlocks: React.Dispatch<React.SetStateAction<DayData>>
  ) => {
    if (block.mode === "newBlock") {
      return null;
    }

    // If it's top row => "default", "allDay", "setTime"
    // Lower rows => "default", "setTime"
    const options: BlockMode[] =
      rowIndex === 0 ? ["default", "allDay", "setTime"] : ["default", "setTime"];

    const handleModeChange = (newMode: BlockMode) => {
      const newBlocks = [...blocks] as DayData;
      const currentBlock = { ...newBlocks[rowIndex] };
      currentBlock.mode = newMode;
      newBlocks[rowIndex] = currentBlock;

      // Force logic for below blocks
      if (rowIndex === 0 && newMode === "setTime") {
        newBlocks[1] = { mode: "default", customRate: globalRate, customMax: globalMax };
        newBlocks[2] = { mode: "newBlock" };
      } else if (rowIndex === 0 && (newMode === "allDay" || newMode === "default")) {
        newBlocks[1] = { mode: "newBlock" };
        newBlocks[2] = { mode: "newBlock" };
      } else if (rowIndex === 1 && newMode === "setTime") {
        newBlocks[2] = { mode: "default", customRate: globalRate, customMax: globalMax };
      } else if (rowIndex === 1 && (newMode === "allDay" || newMode === "default")) {
        newBlocks[2] = { mode: "newBlock" };
      }

      setBlocks(newBlocks);
      setIsDirty(true);
    };

    return (
      <select
        className="block-mode-dropdown"
        value={block.mode}
        onChange={(e) => handleModeChange(e.target.value as BlockMode)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {modeLabelMap[opt]}
          </option>
        ))}
      </select>
    );
  };

  // Lay out each state in a fixed “box” style:
  // default -> top 50% = dropdown, bottom 50% = read-only rates
  // allDay  -> top 50% = dropdown, bottom 50% = editable rates
  // setTime -> top 25% = dropdown, middle 25% = start/end, bottom 50% = rates
  // newBlock -> dashed placeholder
  const renderBlockContent = (
    block: Block,
    rowIndex: number,
    blocks: DayData,
    setBlocks: React.Dispatch<React.SetStateAction<DayData>>
  ) => {
    if (block.mode === "newBlock") {
      return (
        <div className="fixed-box new-block-mode">
          <div className="new-block">New Time Block</div>
        </div>
      );
    }

    if (block.mode === "default") {
      // read-only
      return (
        <div className="fixed-box default-mode">
          {/* top half: the dropdown is already rendered above, so no extra text here */}
          {/* bottom half: read-only rates */}
          <div className="default-bottom">
            <div>All Day (Default)</div>
            <div>
              Hourly: {block.customRate || "--"} | Max: {block.customMax || "--"}
            </div>
          </div>
        </div>
      );
    }

    if (block.mode === "allDay") {
      const handleRateChange = (val: string) => {
        const newBlocks = [...blocks] as DayData;
        newBlocks[rowIndex] = { ...block, customRate: val.replace(/[^0-9.]/g, "") };
        setBlocks(newBlocks);
        setIsDirty(true);
      };
      const handleMaxChange = (val: string) => {
        const newBlocks = [...blocks] as DayData;
        newBlocks[rowIndex] = { ...block, customMax: val.replace(/[^0-9.]/g, "") };
        setBlocks(newBlocks);
        setIsDirty(true);
      };

      return (
        <div className="fixed-box allDay-mode">
          {/* top half: dropdown already in place, no extra text */}
          {/* bottom half: two inputs for rate & max */}
          <div className="allDay-bottom">
            <label className="small-label">All Day</label>
            <div className="price-row">
              <input
                type="number"
                className="block-input"
                placeholder="Rate"
                value={block.customRate ?? ""}
                onChange={(e) => handleRateChange(e.target.value)}
              />
              <span className="block-unit">$/hr</span>
            </div>
            <div className="price-row">
              <input
                type="number"
                className="block-input"
                placeholder="Max"
                value={block.customMax ?? ""}
                onChange={(e) => handleMaxChange(e.target.value)}
              />
              <span className="block-unit">$ Max</span>
            </div>
          </div>
        </div>
      );
    }

    if (block.mode === "setTime") {
      const handleStartChange = (val: string) => {
        const newBlocks = [...blocks] as DayData;
        newBlocks[rowIndex] = { ...block, startTime: val };
        setBlocks(newBlocks);
        setIsDirty(true);
      };
      const handleEndChange = (val: string) => {
        const newBlocks = [...blocks] as DayData;
        newBlocks[rowIndex] = { ...block, endTime: val };
        setBlocks(newBlocks);
        setIsDirty(true);
      };
      const handleRateChange = (val: string) => {
        const newBlocks = [...blocks] as DayData;
        newBlocks[rowIndex] = { ...block, customRate: val.replace(/[^0-9.]/g, "") };
        setBlocks(newBlocks);
        setIsDirty(true);
      };
      const handleMaxChange = (val: string) => {
        const newBlocks = [...blocks] as DayData;
        newBlocks[rowIndex] = { ...block, customMax: val.replace(/[^0-9.]/g, "") };
        setBlocks(newBlocks);
        setIsDirty(true);
      };

      return (
        <div className="fixed-box setTime-mode">
          {/* top 25% = dropdown is outside. 
              next 25% = start/end 
              bottom 50% = rate + max 
          */}
          <div className="setTime-middle">
            <div className="time-row">
              <label>Start:</label>
              <input
                type="time"
                value={block.startTime ?? ""}
                onChange={(e) => handleStartChange(e.target.value)}
                className="block-input"
              />
            </div>
            <div className="time-row">
              <label>End:</label>
              <input
                type="time"
                value={block.endTime ?? ""}
                onChange={(e) => handleEndChange(e.target.value)}
                className="block-input"
              />
            </div>
          </div>
          <div className="setTime-bottom">
            <div className="price-row">
              <input
                type="number"
                placeholder="Rate"
                value={block.customRate ?? ""}
                onChange={(e) => handleRateChange(e.target.value)}
                className="block-input"
              />
              <span className="block-unit">$/hr</span>
            </div>
            <div className="price-row">
              <input
                type="number"
                placeholder="Max"
                value={block.customMax ?? ""}
                onChange={(e) => handleMaxChange(e.target.value)}
                className="block-input"
              />
              <span className="block-unit">$ Max</span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // --------------- RENDER ---------------
  return (
    <div className="content">
      {/* Header with slider */}
      <div className="advanced-settings-header">
        <h1>Advanced Settings</h1>
        <div className="slider-wrapper">
          <Slider checked={advancedEnabled} onChange={handleToggleAdvanced} />
        </div>
      </div>

      {!advancedEnabled && (
        <p>Enable advanced settings to control time of day or day of week pricing.</p>
      )}

      {advancedEnabled && (
        <>
          <p>
            These settings allow for more customized billing periods, including day-of-week or
            time-of-day pricing.
          </p>

          <div className="advanced-grid">
            {/* Day Labels (row 1) */}
            {dayLabels.map((day) => (
              <div className="day-label" key={day}>
                {day}
              </div>
            ))}

            {/* 3 rows for each day */}
            {[0, 1, 2].map((rowIndex) =>
              dayStates.map(({ label, blocks, setter }) => {
                const block = blocks[rowIndex];
                return (
                  <div className="cell" key={label + rowIndex}>
                    {/* The "top portion" or "top row" is basically the dropdown */}
                    {renderBlockDropdown(block, rowIndex, blocks, setter)}
                    {/* Then the content (bottom portion, or middle + bottom for setTime) */}
                    {renderBlockContent(block, rowIndex, blocks, setter)}
                  </div>
                );
              })
            )}
          </div>

          {/* Buttons */}
          <div className="advanced-settings-buttons">
            <button className="button primary" onClick={handleSaveClick}>
              Save
            </button>
            <button className="button secondary" onClick={handleGeneralSettings}>
              General Settings
            </button>
          </div>
        </>
      )}

      {/* ---------- MODALS ---------- */}
      {modalType === "disableAdvanced" && (
        <Modal
          isOpen={true}
          title="Disable Advanced Settings?"
          description="This will remove any custom day/time pricing and revert these fields to empty on the server. Vehicles will be billed at General Settings rates only."
          confirmText="Disable"
          cancelText="Cancel"
          onConfirm={() => {
            confirmDisableAdvanced();
            setModalType(null);
          }}
          onCancel={() => setModalType(null)}
        />
      )}

      {modalType === "confirmSave" && (
        <Modal
          isOpen={true}
          title="Confirm Changes"
          description="You're about to update the advanced pricing data. This change will be recorded in case of disputes."
          confirmText="Update Settings"
          cancelText="Return"
          onConfirm={() => {
            doSave();
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
              pendingAction();
              setPendingAction(null);
            }
            setModalType(null);
          }}
        />
      )}
    </div>
  );
};

export default AdvancedSettings;
