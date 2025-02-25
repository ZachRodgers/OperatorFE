import React from "react";
import "./Slider.css";

interface SliderProps {
  checked: boolean;
  onChange: () => void;
}

const Slider: React.FC<SliderProps> = ({ checked, onChange }) => {
  return (
    <label className="slider-container">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="slider-track">
        <span className="slider-thumb"></span>
      </span>
    </label>
  );
};

export default Slider;
