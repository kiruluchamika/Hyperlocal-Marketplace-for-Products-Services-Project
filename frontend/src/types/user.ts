export type UserRole = 'admin' | 'user';

export interface Address {
  street?: string;
  city: string;
  province?: string;
  postalCode?: string;
  country: string;
}

export interface IUser {
  _id: string;
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
  createdAt: string;
  updatedAt: string;
}
