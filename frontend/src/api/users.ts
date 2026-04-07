import apiClient from './client';
import { IUser } from '@/types';

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  age?: number;
  address?: {
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
  };
  profileImage?: string | null;
  bio?: string;
  sellerProfile?: {
    businessName?: string;
    serviceArea?: string;
    description?: string;
  };
  preferences?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    marketingEmails?: boolean;
  };
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface StripeConnectStatus {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFICATION_FAILED';
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  updatedAt?: string;
}

export interface StripeConnectBalanceItem {
  currency: string;
  amount: number;
}

export interface StripeConnectBalance {
  accountId: string | null;
  available: StripeConnectBalanceItem[];
  pending: StripeConnectBalanceItem[];
}

export const usersApi = {
  getMe: () =>
    apiClient.get<{ user: IUser }>('/users/me'),

  getAll: () =>
    apiClient.get<{ users: IUser[] }>('/users'),

  updateProfile: (data: UpdateProfilePayload) =>
    apiClient.patch<{ message: string; user: IUser }>('/users/me', data),

  changePassword: (data: ChangePasswordPayload) =>
    apiClient.patch<{ message: string }>('/users/me/password', data),

  createStripeConnectOnboarding: (payload?: { returnUrl?: string; refreshUrl?: string }) =>
    apiClient.post<{ success: boolean; data: { onboardingUrl: string; expiresAt: number; accountId: string } }>(
      '/users/stripe-connect/onboarding',
      payload || {}
    ),

  getStripeConnectStatus: () =>
    apiClient.get<{ success: boolean; data: StripeConnectStatus }>('/users/stripe-connect/status'),

  getStripeConnectBalance: () =>
    apiClient.get<{ success: boolean; data: StripeConnectBalance }>('/users/stripe-connect/balance'),
};
