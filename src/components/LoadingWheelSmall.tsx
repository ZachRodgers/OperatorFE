import React from 'react';
import './LoadingWheelSmall.css';

interface LoadingWheelSmallProps {
    className?: string;
}

const LoadingWheelSmall: React.FC<LoadingWheelSmallProps> = ({ className = "" }) => {
    return (
        <div className={`loading-wheel-small ${className}`} />
    );
};

export default LoadingWheelSmall; 