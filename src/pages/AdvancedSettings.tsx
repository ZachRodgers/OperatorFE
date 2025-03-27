import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./AdvancedSettings.css";
import Slider from "../components/Slider";
import Modal from "../components/Modal";
import { lotPricingService } from "../utils/api";

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
  isDefault?: boolean;     // we'll keep this for backward compatibility
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

  // Add missing block logic: if one or two setTime blocks exist, add a default remainder block
  if (blocks.length === 1 && blocks[0].blockMode === "setTime") {
    blocks.push({ blockMode: "default", customRate: globalRate, customMax: globalMax });
  } else if (blocks.length === 2 && blocks[0].blockMode === "setTime" && blocks[1].blockMode === "setTime") {
    blocks.push({ blockMode: "default", customRate: globalRate, customMax: globalMax });
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
 * NEW: If blockMode === "default", we ALSO skip it - we don't need to store these as they use global values
 */
function buildDayPricing(blocks: DayData, globalRate: string, globalMax: string): any[] {
  const result: any[] = [];

  blocks.forEach((block) => {
    // Skip new blocks, no time blocks, and now also DEFAULT blocks
    if (block.blockMode === "newBlock" || block.blockMode === "noTime" || block.blockMode === "default") {
      return; // skip
    }

    // If it's "allDay" => time is 00:00..23:59
    // If it's setTime => use block start/end
    let start = "00:00";
    let end = "23:59";
    if (block.blockMode === "setTime" && block.startTime && block.endTime) {
      start = block.startTime;
      end = block.endTime;
    }

    const hrRate = block.customRate ?? globalRate;
    const maxAmt = block.customMax ?? globalMax;

    // We don't need isDefault flag anymore since we're not saving default blocks
    result.push({
      blockMode: block.blockMode, // <-- store the mode explicitly
      startTime: start,
      endTime: end,
      hourlyRate: hrRate,
      maximumAmount: maxAmt,
      isDefault: false, // We're not saving default blocks, so this is always false
    });
  });

  return result;
}

/**
 * Convert API LotAdvancedPricing entries to the format expected by frontend
 */
function mapApiToFrontendFormat(apiPricings: any[], dayOfWeek: string): any[] {
  return apiPricings
    .filter(pricing => pricing.dayOfWeek === dayOfWeek)
    .map(pricing => {
      // Extract hour and minute from hourStart/hourEnd LocalTime objects
      // The API returns them as {"hour":9,"minute":0,"second":0,"nano":0}
      let startTime = "00:00";
      let endTime = "23:59";

      // Check if hourStart/hourEnd are strings or objects
      if (pricing.hourStart) {
        if (typeof pricing.hourStart === 'string') {
          startTime = pricing.hourStart.substring(0, 5); // "HH:MM"
        } else if (pricing.hourStart.hour !== undefined) {
          // Handle LocalTime object
          const hour = pricing.hourStart.hour.toString().padStart(2, '0');
          const minute = pricing.hourStart.minute.toString().padStart(2, '0');
          startTime = `${hour}:${minute}`;
        }
      }

      if (pricing.hourEnd) {
        if (typeof pricing.hourEnd === 'string') {
          endTime = pricing.hourEnd.substring(0, 5); // "HH:MM"
        } else if (pricing.hourEnd.hour !== undefined) {
          // Handle LocalTime object
          const hour = pricing.hourEnd.hour.toString().padStart(2, '0');
          const minute = pricing.hourEnd.minute.toString().padStart(2, '0');
          endTime = `${hour}:${minute}`;
        }
      }

      // IMPORTANT: Always trust the blockMode property if it exists
      // Since we're not saving default blocks, we'll only have "allDay" or "setTime" here
      const blockMode = pricing.blockMode ||
        ((startTime === "00:00" && endTime === "23:59") ? "allDay" : "setTime");

      return {
        blockMode: blockMode,
        startTime: startTime,
        endTime: endTime,
        hourlyRate: pricing.rate !== null ? pricing.rate.toString() : "",
        // Fix max amount handling, ensure we get the dailyMaximumPrice field directly
        maximumAmount: pricing.dailyMaximumPrice !== null && pricing.dailyMaximumPrice !== undefined
          ? pricing.dailyMaximumPrice.toString()
          : "",
        isDefault: false // Since we're not saving default blocks
      };
    });
}

/**
 * Convert frontend pricing format to API format
 */
function mapFrontendToApiFormat(dayPricing: any[], dayOfWeek: string): any[] {
  const now = new Date().toISOString();

  return dayPricing.map(pricing => {
    // Ensure we have valid time strings, defaults to 00:00 if missing
    const startTime = pricing.startTime && pricing.startTime.trim() ? pricing.startTime.trim() : "00:00";
    const endTime = pricing.endTime && pricing.endTime.trim() ? pricing.endTime.trim() : "23:59";

    // Parse rate as float, defaulting to 0 if invalid
    const rate = parseFloat(pricing.hourlyRate) || 0;

    // Parse maximum amount as float, can be null if not provided
    // More robust handling of the max amount field
    let dailyMaximumPrice = null;
    if (pricing.maximumAmount && pricing.maximumAmount.trim() !== "") {
      const parsedMax = parseFloat(pricing.maximumAmount);
      dailyMaximumPrice = !isNaN(parsedMax) ? parsedMax : null;
    }

    return {
      lotId: "", // Will be set by the backend service
      dayOfWeek: dayOfWeek,
      hourStart: startTime, // Backend will handle conversion to LocalTime
      hourEnd: endTime,
      rate: rate,
      dailyMaximumPrice: dailyMaximumPrice, // Ensure this is properly set
      blockMode: pricing.blockMode || "allDay", // Default to allDay if not specified
      isDefault: false, // We're no longer sending default blocks
      createdOn: now,
      modifiedOn: now,
      advancedSettingsEnabled: true // Signal to the backend that advanced settings are on
    };
  });
}

const AdvancedSettings: React.FC = () => {
  const { customerId, lotId } = useParams<{ customerId: string; lotId: string }>();
  const navigate = useNavigate();

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // General pricing data
  const [generalPricing, setGeneralPricing] = useState<any>(null);
  const [advancedPricing, setAdvancedPricing] = useState<any[]>([]);

  // Get values from general pricing
  const globalRate = generalPricing?.hourlyRate !== undefined ? String(generalPricing.hourlyRate) : "";
  const globalMax = generalPricing?.dailyMaximumPrice !== undefined ? String(generalPricing.dailyMaximumPrice) : "";

  // Parse day arrays from API data
  const [mondayBlocks, setMondayBlocks] = useState<DayData>(() =>
    parseDayPricing([], globalRate, globalMax)
  );
  const [tuesdayBlocks, setTuesdayBlocks] = useState<DayData>(() =>
    parseDayPricing([], globalRate, globalMax)
  );
  const [wednesdayBlocks, setWednesdayBlocks] = useState<DayData>(() =>
    parseDayPricing([], globalRate, globalMax)
  );
  const [thursdayBlocks, setThursdayBlocks] = useState<DayData>(() =>
    parseDayPricing([], globalRate, globalMax)
  );
  const [fridayBlocks, setFridayBlocks] = useState<DayData>(() =>
    parseDayPricing([], globalRate, globalMax)
  );
  const [saturdayBlocks, setSaturdayBlocks] = useState<DayData>(() =>
    parseDayPricing([], globalRate, globalMax)
  );
  const [sundayBlocks, setSundayBlocks] = useState<DayData>(() =>
    parseDayPricing([], globalRate, globalMax)
  );

  // FIX: Set advanced enabled state from API response
  // Determine if advanced is on/off
  const [advancedEnabled, setAdvancedEnabled] = useState(false);

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  type ModalType = null | "disableAdvanced" | "confirmSave" | "unsavedChanges";
  const [modalType, setModalType] = useState<ModalType>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Load both general and advanced pricing data from API
  useEffect(() => {
    const loadData = async () => {
      if (!lotId) return;

      try {
        setIsLoading(true);
        setError(null);

        // Load general pricing first
        const generalData = await lotPricingService.getLatestPricingByLotId(lotId);
        setGeneralPricing(generalData);

        // Then load advanced pricing
        const advancedData = await lotPricingService.getAdvancedPricingByLotId(lotId);
        setAdvancedPricing(advancedData);

        // FIX: Load advanced settings state
        const isAdvancedEnabled = await lotPricingService.getAdvancedSettingsState(lotId);
        setAdvancedEnabled(isAdvancedEnabled || advancedData.length > 0);

        // Initialize all day blocks
        const gRate = generalData?.hourlyRate !== undefined ? String(generalData.hourlyRate) : "";
        const gMax = generalData?.dailyMaximumPrice !== undefined ? String(generalData.dailyMaximumPrice) : "";

        // Parse data for each day
        setMondayBlocks(parseDayPricing(mapApiToFrontendFormat(advancedData, "MONDAY"), gRate, gMax));
        setTuesdayBlocks(parseDayPricing(mapApiToFrontendFormat(advancedData, "TUESDAY"), gRate, gMax));
        setWednesdayBlocks(parseDayPricing(mapApiToFrontendFormat(advancedData, "WEDNESDAY"), gRate, gMax));
        setThursdayBlocks(parseDayPricing(mapApiToFrontendFormat(advancedData, "THURSDAY"), gRate, gMax));
        setFridayBlocks(parseDayPricing(mapApiToFrontendFormat(advancedData, "FRIDAY"), gRate, gMax));
        setSaturdayBlocks(parseDayPricing(mapApiToFrontendFormat(advancedData, "SATURDAY"), gRate, gMax));
        setSundayBlocks(parseDayPricing(mapApiToFrontendFormat(advancedData, "SUNDAY"), gRate, gMax));

      } catch (err) {
        console.error("Error loading pricing data:", err);
        setError("Failed to load pricing data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [lotId]);

  // Update day blocks when general pricing changes
  useEffect(() => {
    if (generalPricing) {
      const gRate = String(generalPricing.hourlyRate || "");
      const gMax = String(generalPricing.dailyMaximumPrice || "");

      // Only update rates for default blocks to avoid overwriting custom rates
      const updateDefaultRates = (blocks: DayData): DayData => {
        return blocks.map(block => {
          if (block.blockMode === "default") {
            return { ...block, customRate: gRate, customMax: gMax };
          }
          return block;
        }) as DayData;
      };

      setMondayBlocks(prev => updateDefaultRates(prev));
      setTuesdayBlocks(prev => updateDefaultRates(prev));
      setWednesdayBlocks(prev => updateDefaultRates(prev));
      setThursdayBlocks(prev => updateDefaultRates(prev));
      setFridayBlocks(prev => updateDefaultRates(prev));
      setSaturdayBlocks(prev => updateDefaultRates(prev));
      setSundayBlocks(prev => updateDefaultRates(prev));
    }
  }, [generalPricing]);

  const dayStates = [
    { label: "Monday", blocks: mondayBlocks, setter: setMondayBlocks },
    { label: "Tuesday", blocks: tuesdayBlocks, setter: setTuesdayBlocks },
    { label: "Wednesday", blocks: wednesdayBlocks, setter: setWednesdayBlocks },
    { label: "Thursday", blocks: thursdayBlocks, setter: setThursdayBlocks },
    { label: "Friday", blocks: fridayBlocks, setter: setFridayBlocks },
    { label: "Saturday", blocks: saturdayBlocks, setter: setSaturdayBlocks },
    { label: "Sunday", blocks: sundayBlocks, setter: setSundayBlocks },
  ];

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
      setIsSaving(true);

      // Reset each day => top block default, bottom blocks newBlock
      dayStates.forEach((day) => {
        day.setter([
          { blockMode: "default", customRate: globalRate, customMax: globalMax },
          { blockMode: "newBlock" },
          { blockMode: "newBlock" },
        ]);
      });
      setAdvancedEnabled(false);

      // Delete all advanced pricing entries in the database
      if (lotId) {
        await lotPricingService.deleteAllAdvancedPricing(lotId);
        // FIX: Save advanced settings state
        await lotPricingService.setAdvancedSettingsState(lotId, false);
      }

      setIsDirty(false);
    } catch (error) {
      alert("Error disabling advanced settings.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  function handleSaveClick() {
    setModalType("confirmSave");
  }

  async function doSave() {
    if (!lotId) {
      alert("No lot ID found");
      return;
    }

    try {
      setIsSaving(true);

      // Prepare all day blocks for the API
      const allPricingDTOs = [
        ...buildDayPricing(mondayBlocks, globalRate, globalMax).map(p => mapFrontendToApiFormat([p], "MONDAY")[0]),
        ...buildDayPricing(tuesdayBlocks, globalRate, globalMax).map(p => mapFrontendToApiFormat([p], "TUESDAY")[0]),
        ...buildDayPricing(wednesdayBlocks, globalRate, globalMax).map(p => mapFrontendToApiFormat([p], "WEDNESDAY")[0]),
        ...buildDayPricing(thursdayBlocks, globalRate, globalMax).map(p => mapFrontendToApiFormat([p], "THURSDAY")[0]),
        ...buildDayPricing(fridayBlocks, globalRate, globalMax).map(p => mapFrontendToApiFormat([p], "FRIDAY")[0]),
        ...buildDayPricing(saturdayBlocks, globalRate, globalMax).map(p => mapFrontendToApiFormat([p], "SATURDAY")[0]),
        ...buildDayPricing(sundayBlocks, globalRate, globalMax).map(p => mapFrontendToApiFormat([p], "SUNDAY")[0]),
      ];

      // Only proceed if we have at least one pricing block
      if (allPricingDTOs.length > 0) {
        // Update all advanced pricing settings in one call
        await lotPricingService.updateAdvancedPricing(lotId, allPricingDTOs);
        // FIX: Save advanced settings state
        await lotPricingService.setAdvancedSettingsState(lotId, true);
      } else {
        // If no advanced pricing, delete any existing ones
        await lotPricingService.deleteAllAdvancedPricing(lotId);
        // FIX: Save advanced settings state
        await lotPricingService.setAdvancedSettingsState(lotId, false);
      }

      setIsDirty(false);
      setModalType(null);

      // Show success message
    } catch (error) {
      console.error(error);
      alert("Failed to update advanced settings.");
      setModalType(null);
    } finally {
      setIsSaving(false);
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
      const endA = parseTime(top.endTime ?? "");
      const durA = (endA - startA + 1440) % 1440;

      const startB = parseTime(mid.startTime ?? "");
      const endB = parseTime(mid.endTime ?? "");
      const durB = (endB - startB + 1440) % 1440;

      if (durA + durB === 1440) {
        // covers full day => bottom => noTime
        if (bottom.blockMode !== "noTime") {
          blocks[2] = { blockMode: "noTime" }; // "No Remaining Time Available"
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

  // Show loading indicator while data is being fetched
  if (isLoading) {
    return (
      <div className="content">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading advanced settings...</p>
        </div>
      </div>
    );
  }

  // Show error message if there was a problem loading data
  if (error) {
    return (
      <div className="content">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button className="button primary" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
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
            <button
              className="button primary"
              onClick={handleSaveClick}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
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
