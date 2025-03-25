import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { lotService } from '../utils/api';

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

  // Function to fetch lot data
  const fetchLotData = async () => {
    if (!lotId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await lotService.getLotById(lotId);
      setLotData(data);
    } catch (err) {
      console.error('Error fetching lot data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch lot data'));
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
