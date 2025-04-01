import React from 'react';

interface UnprotectedRouteProps {
    children: React.ReactNode;
}

const UnprotectedRoute: React.FC<UnprotectedRouteProps> = ({ children }) => {
    // Just render children without any checks
    return <>{children}</>;
};

export default UnprotectedRoute; 