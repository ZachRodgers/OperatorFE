import React, { useState, useRef, useEffect } from "react";
import "./Tooltip.css";

interface TooltipProps {
  text: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text }) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<"right" | "left">("right");
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && tooltipRef.current && containerRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      // Check if there's enough space to the right, else move left
      if (tooltipRect.right > window.innerWidth) {
        setPosition("left");
      } else {
        setPosition("right");
      }
    }
  }, [visible]);

  return (
    <div
      className="tooltip-container"
      ref={containerRef}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <img src="/assets/info.svg" alt="Info" className="tooltip-icon" />
      {visible && (
        <div className={`tooltip-box ${position}`} ref={tooltipRef}>
          {text}
          <div className="tooltip-arrow"></div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
