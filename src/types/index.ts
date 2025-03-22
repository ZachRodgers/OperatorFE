// User Interface
export interface User {
  userId: string;
  email: string;
  name: string;
  phoneNo?: string;
  role: string;
  assignedLots?: string[];
  isVerified?: boolean;
  lastLogin?: string;
}

// Lot Interface
export interface Lot {
  lotId: string;
  lotName: string;
  address: string;
  ownerCustomerId: string;
  geoLocation?: {
    lat: string;
    long: string;
  };
  lotCapacity?: number;
  listedDeviceIds?: string[];
  accountStatus?: string;
  accountCreated?: string;
  notificationRecipients?: string[];
} 