import React, { useState } from "react";
import "./Tooltip.css";

interface TooltipProps {
  text: string;
  position?: "left" | "right";
}

const Tooltip: React.FC<TooltipProps> = ({ text, position = "right" }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="tooltip-container"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <img src="/assets/info.svg" alt="Info" className="tooltip-icon" />
      {visible && (
        <div className={`tooltip-box ${position}`}>
          <div className={`tooltip-arrow-border ${position}`}></div> {/* Outer stroke */}
          <div className={`tooltip-arrow ${position}`}></div> {/* Inner fill */}
          {text}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
