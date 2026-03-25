export type UserRole = 'admin' | 'user';
export type KycStatus = 'UNSUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface Address {
  street?: string;
  city: string;
  province?: string;
  postalCode?: string;
  country: string;
}

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  age: number;
  address: Address;
  googleId?: string;
  emailVerified: boolean;
  isProfileComplete: boolean;
  profileImage?: string;
  bio?: string;
  verification: {
    kycStatus: KycStatus;
    kycSubmittedAt?: string;
    kycReviewedAt?: string;
  };
  preferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    marketingEmails: boolean;
  };
  sellerProfile?: {
    businessName?: string;
    serviceArea?: string;
    description?: string;
  };
  createdAt: string;
  updatedAt: string;
}
