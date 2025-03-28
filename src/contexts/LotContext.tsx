import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { lotService } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

// Define the shape of our lot data
interface LotData {
  lotId: string;
  lotName: string;
  companyName: string;
  address: string;
  lotCapacity: number;
  registryOn: boolean;
  ownerCustomerId: string;
  accountStatus: string;
  isDeleted: boolean;
  // Add other properties as needed
  [key: string]: any;
}

// Define the shape of our context
interface LotContextType {
  lotData: LotData | null;
  loading: boolean;
  error: Error | null;
  fetchLotData: () => Promise<void>;
  invalidateData: () => void;
}

// Create the context with a default value
const LotContext = createContext<LotContextType | undefined>(undefined);

// Props for LotProvider
interface LotProviderProps {
  children: ReactNode;
  lotId: string | undefined;
}

// Create the provider component
export const LotProvider: React.FC<LotProviderProps> = ({ children, lotId }) => {
  const [lotData, setLotData] = useState<LotData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [invalidationToken, setInvalidationToken] = useState<number>(0);
  const navigate = useNavigate();
  const { user, userLots, fetchUserLots } = useUser();

  // Check if user has access to this lot
  useEffect(() => {
    // Skip checks if we don't have a lotId
    if (!lotId || !user) return;

    // If userLots is empty, fetch them first
    if (userLots.length === 0) {
      fetchUserLots().then(lots => {
        if (!lots.some(lot => lot.lotId === lotId)) {
          // User doesn't have access to this lot, redirect to login
          console.log(`User ${user.userId} attempted to access unauthorized lot ${lotId}`);
          navigate('/login');
        }
      });
    } else {
      // Check if user has access to this lot
      if (!userLots.some(lot => lot.lotId === lotId)) {
        // User doesn't have access to this lot, redirect to login
        console.log(`User ${user.userId} attempted to access unauthorized lot ${lotId}`);
        navigate('/login');
      }
    }
  }, [lotId, user, userLots, fetchUserLots, navigate]);

  // Function to fetch lot data
  const fetchLotData = async () => {
    if (!lotId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await lotService.getLotById(lotId);
      setLotData(data);
    } catch (err: any) {
      console.error('Error fetching lot data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch lot data'));
      // If we get a 403 or 404, navigate to login
      if (err.response && (err.response.status === 403 || err.response.status === 404)) {
        console.log('Unauthorized access or lot not found, redirecting to login');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to invalidate data (forces a refetch)
  const invalidateData = () => {
    setInvalidationToken(prev => prev + 1);
  };

  // Fetch lot data when the component mounts or lotId/invalidationToken changes
  useEffect(() => {
    fetchLotData();
  }, [lotId, invalidationToken]);

  // Provide the context value
  const contextValue: LotContextType = {
    lotData,
    loading,
    error,
    fetchLotData,
    invalidateData
  };

  return <LotContext.Provider value={contextValue}>{children}</LotContext.Provider>;
};

// Create a custom hook to use the context
export const useLot = (): LotContextType => {
  const context = useContext(LotContext);
  if (context === undefined) {
    throw new Error('useLot must be used within a LotProvider');
  }
  return context;
};
