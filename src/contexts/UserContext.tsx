import React, { createContext, useContext, useState, useCallback } from 'react';

interface User {
    userId: string;
    name: string;
    email: string;
    role: string;
    phoneNo?: string;
    assignedLots?: string[];
    isVerified?: boolean;
    lastLogin?: string;
}

interface UserContextType {
    user: User | null;
    userLots: any[];
    loading: boolean;
    error: string | null;
    fetchUserData: () => Promise<void>;
    fetchUserLots: () => Promise<any[]>;
    logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [loading] = useState(false);
    const [error] = useState<string | null>(null);

    // Mock user data
    const mockUser: User = {
        userId: "MOCK-USER-001",
        name: "April Fools Admin",
        email: "admin@example.com",
        role: "ADMIN",
        phoneNo: "555-0123",
        assignedLots: ["PWP-PL-0000001"],
        isVerified: true,
        lastLogin: new Date().toISOString()
    };

    const [user] = useState<User | null>(mockUser);
    const [userLots] = useState<any[]>([{
        lotId: "PWP-PL-0000001",
        name: "April Fools Parking Lot",
        address: "123 Prank Street"
    }]);

    const fetchUserData = useCallback(async () => {
        // Do nothing, we're using mock data
        return Promise.resolve();
    }, []);

    const fetchUserLots = useCallback(async () => {
        // Return mock lots
        return Promise.resolve(userLots);
    }, [userLots]);

    const logout = useCallback(() => {
        // Do nothing, we're bypassing authentication
    }, []);

    return (
        <UserContext.Provider value={{
            user,
            userLots,
            loading,
            error,
            fetchUserData,
            fetchUserLots,
            logout
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}; 