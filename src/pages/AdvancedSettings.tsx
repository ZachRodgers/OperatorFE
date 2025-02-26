import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Slider from "../components/Slider"; // Path: /src/components/Slider.tsx
import "./AdvancedSettings.css";

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const AdvancedSettings: React.FC = () => {
  const [advancedEnabled, setAdvancedEnabled] = useState(false);
  
  // Pull out customerId and lotId from URL
  const { customerId, lotId } = useParams<{ customerId: string; lotId: string }>();
  const navigate = useNavigate();

  // Flip the state when the slider is clicked
  const handleToggle = () => {
    setAdvancedEnabled((prev) => !prev);
  };

  // Just a stub for “Save”:
  // Replace with your own logic, e.g. an API call to persist advanced settings.
  const handleSave = () => {
    alert("Saved advanced settings! (Implement your save logic here.)");
  };

  // Go to the General Settings page
  const handleGeneralSettings = () => {
    // Typically: /:customerId/:lotId/settings
    if (customerId && lotId) {
      navigate(`/${customerId}/${lotId}/settings`);
    } else {
      // If IDs aren’t in the URL, fallback or show an error
      alert("No lot selected!");
    }
  };

  return (
    <div className="content">
      {/* Header row with title on the left and slider on the right */}
      <div className="advanced-settings-header">
        <h1>Advanced Settings</h1>
        <div className="slider-wrapper">
          <Slider checked={advancedEnabled} onChange={handleToggle} />
        </div>
      </div>

      {!advancedEnabled && (
        <p>
          Enable advanced settings to control time of day or day of week pricing.
        </p>
      )}

      {advancedEnabled && (
        <>
          {/* Replaced line of text per your request */}
          <p>
            These settings allow for more customization billing periods. Including 
            week day pricing, or time of day pricing.
          </p>

          {/* The 7×3 grid */}
          <div className="advanced-grid">
            {/* 1st row: day labels */}
            {days.map((day) => (
              <div className="day-label" key={day}>
                {day}
              </div>
            ))}

            {/* Next 3 rows: placeholders for cell “states” */}
            {[1, 2, 3].map((rowIndex) =>
              days.map((day) => (
                <div className="cell" key={day + rowIndex}>
                  {/* Just a placeholder for now */}
                  Cell State {rowIndex}
                </div>
              ))
            )}
          </div>

          {/* Buttons at the bottom */}
          <div className="advanced-settings-buttons">
            <button className="button primary" onClick={handleSave}>
              Save
            </button>
            <button
              className="button secondary"
              onClick={handleGeneralSettings}
            >
              General Settings
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AdvancedSettings;
