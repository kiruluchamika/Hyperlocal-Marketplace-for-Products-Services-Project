import apiClient from './client';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone: string;
  age: number;
  address: {
    street?: string;
    city: string;
    province?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
    phone: string;
    age: number;
    address: Record<string, string>;
    emailVerified: boolean;
    isProfileComplete: boolean;
    profileImage?: string;
    bio?: string;
  };
}

export const authApi = {
  register: (data: RegisterPayload) =>
    apiClient.post<AuthResponse>('/auth/register', data),

  login: (data: LoginPayload) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  googleLogin: (idToken: string) =>
    apiClient.post<AuthResponse>('/auth/social/google', { idToken }),
};
