import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lot } from '../types';
import { userService, lotService } from '../utils/api';
import { getAuthData, clearAuthData } from '../utils/auth';

interface UserContextType {
    user: User | null;
    userLots: Lot[];
    loading: boolean;
    error: string | null;
    fetchUserData: () => Promise<User | null>;
    fetchUserLots: () => Promise<Lot[]>;
    logout: () => void;
    isServerOffline: boolean;
    retryConnection: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userLots, setUserLots] = useState<Lot[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isServerOffline, setIsServerOffline] = useState<boolean>(false);
    const navigate = useNavigate();

    // Handler for server status events
    useEffect(() => {
        const handleServerStatus = (event: any) => {
            if (event.detail.status === 'offline') {
                setIsServerOffline(true);
            } else if (event.detail.status === 'online') {
                setIsServerOffline(false);
            }
        };

        window.addEventListener('server-status', handleServerStatus);
        return () => {
            window.removeEventListener('server-status', handleServerStatus);
        };
    }, []);

    const fetchUserData = async () => {
        setLoading(true);
        setError(null);
        try {
            const authData = getAuthData();
            if (!authData) {
                throw new Error('Not authenticated');
            }

            const userData = await userService.getUserById(authData.userId);
            setUser(userData);
            return userData;
        } catch (err: any) {
            console.error('Error fetching user data:', err);
            setError(err.message || 'Failed to fetch user data');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const fetchUserLots = async () => {
        setLoading(true);
        setError(null);
        try {
            const authData = getAuthData();
            if (!authData) {
                throw new Error('Not authenticated');
            }

            const lots = await lotService.getLotsByUserId(authData.userId);
            setUserLots(lots);
            return lots;
        } catch (err: any) {
            console.error('Error fetching user lots:', err);
            setError(err.message || 'Failed to fetch user lots');
            return [];
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        clearAuthData();
        setUser(null);
        setUserLots([]);
        navigate('/login');
    };

    const retryConnection = () => {
        // Try to fetch user data again to see if server is back online
        fetchUserData().then(userData => {
            if (userData) {
                // If successful, also fetch lots
                fetchUserLots();
                // Reset the offline state
                setIsServerOffline(false);
            }
        });
    };

    // Load user data on initial mount if authenticated
    useEffect(() => {
        const authData = getAuthData();
        if (authData) {
            // Load user data, then load user lots data
            fetchUserData().then(userData => {
                if (userData) {
                    fetchUserLots();
                }
            });
        } else {
            setLoading(false);
        }
    }, []);

    return (
        <UserContext.Provider
            value={{
                user,
                userLots,
                loading,
                error,
                fetchUserData,
                fetchUserLots,
                logout,
                isServerOffline,
                retryConnection
            }}
        >
            {children}
        </UserContext.Provider>
    );
};

export default UserContext; 