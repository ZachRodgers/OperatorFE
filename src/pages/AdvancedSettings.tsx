import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./AdvancedSettings.css";
import Slider from "../components/Slider";
import Modal from "../components/Modal";
import lotPricingData from "../data/lot_pricing.json";

/**
 * Helper: parse "HH:MM" into total minutes (0..1439).
 */
function parseTime(str: string): number {
  if (!str || !str.includes(":")) return 0;
  const [hh, mm] = str.split(":").map(Number);
  const hSafe = isNaN(hh) ? 0 : Math.min(Math.max(hh, 0), 23);
  const mSafe = isNaN(mm) ? 0 : Math.min(Math.max(mm, 0), 59);
  return hSafe * 60 + mSafe;
}

type BlockMode = "default" | "allDay" | "setTime" | "newBlock" | "noTime";

interface Block {
  blockMode: BlockMode;    // <-- we store the mode in JSON so we can restore
  startTime?: string;
  endTime?: string;
  customRate?: string;
  customMax?: string;
  isDefault?: boolean;     // we’ll keep this for backward compatibility
}

/** 
 * We store up to 3 blocks. 
 */
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

/** 
 * Convert the loaded JSON day array into our 3-block structure.
 * We look for `blockMode` if present; if not, we guess from isDefault or times.
 */
function parseDayPricing(dayPricing: any[], globalRate: string, globalMax: string): DayData {
  // If no data => 1 "default" block, then 2 "newBlock"
  if (!dayPricing || dayPricing.length === 0) {
    return [
      { blockMode: "default", customRate: globalRate, customMax: globalMax },
      { blockMode: "newBlock" },
      { blockMode: "newBlock" },
    ];
  }

  const blocks: Block[] = [];
  for (let i = 0; i < dayPricing.length && i < 3; i++) {
    const entry = dayPricing[i];

    // If the JSON already has a blockMode, use it
    let mode: BlockMode = "default";
    if (entry.blockMode) {
      mode = entry.blockMode;
    } else {
      // If no blockMode, infer from isDefault / times
      if (entry.isDefault) {
        mode = "default";
      } else if (entry.startTime && entry.endTime && entry.startTime === "00:00" && entry.endTime === "23:59") {
        mode = "allDay";
      } else if (entry.startTime && entry.endTime) {
        mode = "setTime";
      }
    }

    blocks.push({
      blockMode: mode,
      startTime: entry.startTime ?? "",
      endTime: entry.endTime ?? "",
      customRate: entry.hourlyRate ?? globalRate,
      customMax: entry.maximumAmount ?? globalMax,
      isDefault: !!entry.isDefault,
    });
  }

  // Fill the rest with newBlock
  while (blocks.length < 3) {
    blocks.push({ blockMode: "newBlock" });
  }

  return blocks as DayData;
}

/**
 * Build the array for JSON. We'll include "blockMode" so we can restore precisely.
 * If blockMode === "noTime", we skip it (or store it with zero coverage).
 */
function buildDayPricing(blocks: DayData, globalRate: string, globalMax: string): any[] {
  const result: any[] = [];

  blocks.forEach((block) => {
    if (block.blockMode === "newBlock" || block.blockMode === "noTime") {
      return; // skip
    }

    // If it's "allDay" or "default" => time is 00:00..23:59
    // If it's setTime => use block start/end
    let start = "00:00";
    let end = "23:59";
    if (block.blockMode === "setTime" && block.startTime && block.endTime) {
      start = block.startTime;
      end = block.endTime;
    }

    const hrRate = block.customRate ?? globalRate;
    const maxAmt = block.customMax ?? globalMax;

    const isDefault = (block.blockMode === "default");

    result.push({
      blockMode: block.blockMode, // <-- store the mode for next time
      startTime: start,
      endTime: end,
      hourlyRate: hrRate,
      maximumAmount: maxAmt,
      isDefault: isDefault,
    });
  });

  return result;
}

const AdvancedSettings: React.FC = () => {
  const { customerId, lotId } = useParams<{ customerId: string; lotId: string }>();
  const navigate = useNavigate();

  // Find pricing for this lot
  const pricing = lotPricingData.find((entry: any) => entry.lotId === lotId);
  const globalRate = pricing?.hourlyRate !== undefined ? String(pricing.hourlyRate) : "";
  const globalMax = pricing?.maximumAmount !== undefined ? String(pricing.maximumAmount) : "";

  // Parse day arrays from JSON
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

  // Determine if advanced is on/off
  const [advancedEnabled, setAdvancedEnabled] = useState(() => {
    return dayStates.some((day) => day.blocks.some((b) => b.blockMode === "allDay" || b.blockMode === "setTime"));
  });

  const [isDirty, setIsDirty] = useState(false);

  type ModalType = null | "disableAdvanced" | "confirmSave" | "unsavedChanges";
  const [modalType, setModalType] = useState<ModalType>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // ------------- HANDLERS -------------
  const handleToggleAdvanced = () => {
    if (!advancedEnabled) {
      setAdvancedEnabled(true);
      setIsDirty(true);
    } else {
      setModalType("disableAdvanced");
    }
  };

  async function confirmDisableAdvanced() {
    try {
      // Reset each day => top block default, bottom blocks newBlock
      dayStates.forEach((day) => {
        day.setter([
          { blockMode: "default", customRate: globalRate, customMax: globalMax },
          { blockMode: "newBlock" },
          { blockMode: "newBlock" },
        ]);
      });
      setAdvancedEnabled(false);

      // Send empty arrays to server
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

      const resp = await fetch("http://localhost:5000/update-lot-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPricing),
      });
      if (!resp.ok) throw new Error("Failed to disable advanced settings");
      setIsDirty(false);
    } catch (error) {
      alert("Error disabling advanced settings.");
      console.error(error);
    }
  }

  function handleSaveClick() {
    setModalType("confirmSave");
  }

  async function doSave() {
    // build the arrays
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
      if (!resp.ok) throw new Error("Failed to update advanced settings");
      setIsDirty(false);
      setModalType(null);
    } catch (error) {
      console.error(error);
      alert("Failed to update advanced settings.");
      setModalType(null);
    }
  }

  function handleNavigation(path: string) {
    if (isDirty) {
      setPendingAction(() => () => navigate(path));
      setModalType("unsavedChanges");
    } else {
      navigate(path);
    }
  }

  function handleGeneralSettings() {
    if (customerId && lotId) {
      handleNavigation(`/${customerId}/${lotId}/settings`);
    } else {
      alert("No lot selected!");
    }
  }

  // ------------ COVERAGE LOGIC -----------
  /** 
   * Check if top 2 setTime blocks sum 24h => bottom row => noTime 
   * Otherwise => bottom row => default remainder 
   */
  function maybeAdjustThirdRow(blocks: DayData) {
    const top = blocks[0];
    const mid = blocks[1];
    const bottom = blocks[2];

    // If top/mid both setTime, compute coverage
    if (top.blockMode === "setTime" && mid.blockMode === "setTime") {
      const startA = parseTime(top.startTime ?? "");
      const endA   = parseTime(top.endTime ?? "");
      const durA   = (endA - startA + 1440) % 1440;

      const startB = parseTime(mid.startTime ?? "");
      const endB   = parseTime(mid.endTime ?? "");
      const durB   = (endB - startB + 1440) % 1440;

      if (durA + durB === 1440) {
        // covers full day => bottom => noTime
        if (bottom.blockMode !== "noTime") {
          blocks[2] = { blockMode: "noTime" }; // “No Remaining Time Available”
        }
      } else {
        // partial coverage => bottom => default remainder
        if (bottom.blockMode === "noTime") {
          blocks[2] = {
            blockMode: "default",
            customRate: globalRate,
            customMax: globalMax,
          };
        }
      }
    } else {
      // If top or mid is not setTime => revert bottom => default remainder if it was "noTime"
      if (bottom.blockMode === "noTime") {
        blocks[2] = {
          blockMode: "default",
          customRate: globalRate,
          customMax: globalMax,
        };
      }
    }
  }

  // -------------- RENDER UTILS -------------
  const modeLabelMap: Record<BlockMode, string> = {
    default: "Default",
    allDay: "All Day",
    setTime: "Set Time",
    newBlock: "New Time Block",
    noTime: "No Remaining Time Available",
  };

  function renderBlockDropdown(
    block: Block,
    rowIndex: number,
    blocks: DayData,
    setBlocks: React.Dispatch<React.SetStateAction<DayData>>
  ) {
    if (block.blockMode === "newBlock" || block.blockMode === "noTime") {
      return null; // hide entirely
    }
    // If rowIndex=2 and it's default => remainder => hide dropdown
    if (rowIndex === 2 && block.blockMode === "default") {
      return null;
    }

    const options: BlockMode[] =
      rowIndex === 0 ? ["default", "allDay", "setTime"] : ["default", "setTime"];

    function handleChange(newMode: BlockMode) {
      const newBlocks = [...blocks] as DayData;
      newBlocks[rowIndex] = { ...newBlocks[rowIndex], blockMode: newMode };

      // same forced logic
      if (rowIndex === 0 && newMode === "setTime") {
        newBlocks[1] = { blockMode: "default", customRate: globalRate, customMax: globalMax };
        newBlocks[2] = { blockMode: "newBlock" };
      } else if (rowIndex === 0 && (newMode === "allDay" || newMode === "default")) {
        newBlocks[1] = { blockMode: "newBlock" };
        newBlocks[2] = { blockMode: "newBlock" };
      } else if (rowIndex === 1 && newMode === "setTime") {
        newBlocks[2] = { blockMode: "default", customRate: globalRate, customMax: globalMax };
      } else if (rowIndex === 1 && (newMode === "allDay" || newMode === "default")) {
        newBlocks[2] = { blockMode: "newBlock" };
      }

      setBlocks(newBlocks);
      setIsDirty(true);
    }

    return (
      <select
        className={
          "block-mode-dropdown" + (block.blockMode === "setTime" ? " settime-dropdown" : "")
        }
        value={block.blockMode}
        onChange={(e) => handleChange(e.target.value as BlockMode)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {modeLabelMap[opt]}
          </option>
        ))}
      </select>
    );
  }

  function renderBlockContent(
    block: Block,
    rowIndex: number,
    blocks: DayData,
    setBlocks: React.Dispatch<React.SetStateAction<DayData>>
  ) {
    // noTime => show "No Remaining Time Available"
    if (block.blockMode === "noTime") {
      return (
        <div className="fixed-box new-block-mode">
          <div className="new-block">No Remaining Time Available</div>
        </div>
      );
    }
    if (block.blockMode === "newBlock") {
      return (
        <div className="fixed-box new-block-mode">
          <div className="new-block">New Time Block</div>
        </div>
      );
    }

    if (block.blockMode === "default") {
      const labelText = rowIndex === 0 ? "All Day" : "Remainder";
      return (
        <div className="fixed-box allDay-mode">
          <div className="allDay-bottom">
            <label className="small-label">{labelText}</label>
            <div className="price-row">
              <input
                type="number"
                className="block-input"
                value={block.customRate ?? ""}
                disabled
              />
              <span className="block-unit">$/hr</span>
            </div>
            <div className="price-row">
              <input
                type="number"
                className="block-input"
                value={block.customMax ?? ""}
                disabled
              />
              <span className="block-unit">$ Max</span>
            </div>
          </div>
        </div>
      );
    }

    if (block.blockMode === "allDay") {
      const handleRateChange = (val: string) => {
        const newBlocks = [...blocks] as DayData;
        newBlocks[rowIndex] = {
          ...block,
          customRate: val.replace(/[^0-9.]/g, ""),
        };
        setBlocks(newBlocks);
        setIsDirty(true);
      };
      const handleMaxChange = (val: string) => {
        const newBlocks = [...blocks] as DayData;
        newBlocks[rowIndex] = {
          ...block,
          customMax: val.replace(/[^0-9.]/g, ""),
        };
        setBlocks(newBlocks);
        setIsDirty(true);
      };
      return (
        <div className="fixed-box allDay-mode">
          <div className="allDay-bottom">
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

    if (block.blockMode === "setTime") {
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
          <div className="setTime-middle">
            <input
              type="time"
              lang="en-GB"  // Force 24h in many browsers
              step="60"
              value={block.startTime ?? ""}
              onChange={(e) => handleStartChange(e.target.value)}
              className="time-input"
            />
            <input
              type="time"
              lang="en-GB"
              step="60"
              value={block.endTime ?? ""}
              onChange={(e) => handleEndChange(e.target.value)}
              className="time-input"
            />
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
  }

  return (
    <div className="content">
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
          <p>These settings allow for more customized billing periods. Time must be 24‐hour format.</p>

          <div className="advanced-grid">
            {/* Row 1: day labels */}
            {dayLabels.map((day) => (
              <div className="day-label" key={day}>
                {day}
              </div>
            ))}

            {/* Rows 2..4 => blocks */}
            {[0, 1, 2].map((rowIndex) =>
              dayStates.map(({ label, blocks, setter }) => {
                // auto-check coverage before rendering rowIndex=2
                if (rowIndex === 2) {
                  maybeAdjustThirdRow(blocks);
                }
                const block = blocks[rowIndex];

                return (
                  <div className="cell" key={label + rowIndex}>
                    {renderBlockDropdown(block, rowIndex, blocks, setter)}
                    {renderBlockContent(block, rowIndex, blocks, setter)}
                  </div>
                );
              })
            )}
          </div>

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

      {modalType === "disableAdvanced" && (
        <Modal
          isOpen
          title="Disable Advanced Settings?"
          description="This removes custom day/time pricing and reverts to General Settings."
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
          isOpen
          title="Confirm Changes"
          description="You're about to update advanced pricing on the server."
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
          isOpen
          title="You have unsaved changes!"
          description="Changes will not be applied unless you save before leaving."
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
