import { create } from 'zustand';
import { IUser } from '@/types';
import { authApi, LoginPayload, RegisterPayload } from '@/api/auth';
import { usersApi } from '@/api/users';
import toast from 'react-hot-toast';
import axios from 'axios';
import { authStorage } from '@/utils/authStorage';

interface AuthState {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (payload: LoginPayload) => Promise<void>;
  adminLogin: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  socialLogin: (idToken: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  setUser: (user: IUser) => void;
  initialize: () => void;
  persistSession: (token: string, user: IUser) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: authStorage.getToken(),
  isAuthenticated: !!authStorage.getToken(),
  isLoading: false,

  persistSession: (token: string, user: IUser) => {
    authStorage.persistSession(token, user);
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  initialize: () => {
    const { token, user: userStr } = authStorage.migrateLegacySession();
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true });
      } catch {
        authStorage.clearSession();
        set({ user: null, token: null, isAuthenticated: false });
      }
    }
  },

  login: async (payload) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.login(payload);
      const { token, user } = data;
      get().persistSession(token, user);
      toast.success(`Welcome back, ${user.name}!`);
    } catch {
      set({ isLoading: false });
      throw new Error('Login failed');
    }
  },

  adminLogin: async (payload) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.adminLogin(payload);
      const { token, user } = data;
      get().persistSession(token, user);
      toast.success('Admin login successful');
    } catch (error) {
      set({ isLoading: false });
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string } | undefined)?.message ||
          'Admin login failed';
        throw new Error(message);
      }
      throw new Error('Admin login failed');
    }
  },

  register: async (payload) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.register(payload);
      const { token, user } = data;
      get().persistSession(token, user);
      toast.success('Account created successfully!');
    } catch {
      set({ isLoading: false });
      throw new Error('Registration failed');
    }
  },

  socialLogin: async (idToken) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.googleLogin(idToken);
      const { token, user } = data;
      get().persistSession(token, user);
      toast.success(`Welcome, ${user.name}!`);
    } catch (error) {
      set({ isLoading: false });
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string } | undefined)?.message ||
          'Social login failed';
        throw new Error(message);
      }
      throw new Error('Social login failed');
    }
  },

  logout: () => {
    authStorage.clearSession();
    set({ user: null, token: null, isAuthenticated: false });
    toast.success('Logged out successfully');
  },

  fetchUser: async () => {
    if (!get().token) return;
    try {
      const { data } = await usersApi.getMe();
      const user = data.user;
      authStorage.setUser(user);
      set({ user });
    } catch {
      get().logout();
    }
  },

  setUser: (user) => {
    authStorage.setUser(user);
    set({ user });
  },
}));
