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

export const usersApi = {
  getMe: () =>
    apiClient.get<{ user: IUser }>('/users/me'),

  getAll: () =>
    apiClient.get<{ users: IUser[] }>('/users'),

  updateProfile: (data: UpdateProfilePayload) =>
    apiClient.patch<{ message: string; user: IUser }>('/users/me', data),

  changePassword: (data: ChangePasswordPayload) =>
    apiClient.patch<{ message: string }>('/users/me/password', data),
};
