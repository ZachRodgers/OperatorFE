import React from 'react';
import './LoadingWheel.css';

interface LoadingWheelProps {
    text?: string;
}

const LoadingWheel: React.FC<LoadingWheelProps> = ({ text = "Loading..." }) => {
    return (
        <div className="content">
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p className="loading-text">{text}</p>
            </div>
        </div>
    );
};

export default LoadingWheel; 