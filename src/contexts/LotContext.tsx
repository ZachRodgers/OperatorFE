import React, { createContext, useContext, useState, useCallback } from 'react';

interface LotData {
  lotId: string;
  name: string;
  lotName?: string;
  address: string;
  ownerCustomerId: string;
  companyName?: string;
  lotCapacity?: number;
}

interface LotContextType {
  lotData: LotData | null;
  loading: boolean;
  error: Error | null;
  fetchLotData: () => Promise<void>;
  invalidateData: () => void;
}

const LotContext = createContext<LotContextType | undefined>(undefined);

export const useLot = () => {
  const context = useContext(LotContext);
  if (context === undefined) {
    throw new Error('useLot must be used within a LotProvider');
  }
  return context;
};

interface LotProviderProps {
  children: React.ReactNode;
  lotId?: string;
}

export const LotProvider: React.FC<LotProviderProps> = ({ children, lotId }) => {
  const [loading] = useState(false);
  const [error] = useState<Error | null>(null);

  // Mock lot data with additional properties
  const mockLotData: LotData = {
    lotId: lotId || "PWP-PL-0000001",
    name: "Parking Lot",
    lotName: "Parking Lot",
    address: "123 Prank Street",
    ownerCustomerId: "MOCK-USER-001",
    companyName: "Parallel Inc.",
    lotCapacity: 50
  };

  const [lotData] = useState<LotData | null>(mockLotData);

  const fetchLotData = useCallback(async () => {
    // Do nothing, we're using mock data
    return Promise.resolve();
  }, []);

  const invalidateData = useCallback(() => {
    // Do nothing, we're using static mock data
  }, []);

  return (
    <LotContext.Provider value={{
      lotData,
      loading,
      error,
      fetchLotData,
      invalidateData
    }}>
      {children}
    </LotContext.Provider>
  );
};
