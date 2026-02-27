import apiClient from './client';
import { IUser } from '@/types';

export const usersApi = {
  getMe: () =>
    apiClient.get<{ user: IUser }>('/users/me'),

  getAll: () =>
    apiClient.get<{ users: IUser[] }>('/users'),

  updateProfile: (data: Partial<IUser>) =>
    apiClient.put<{ user: IUser }>('/users/me', data),
};
