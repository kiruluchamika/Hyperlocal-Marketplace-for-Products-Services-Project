import { create } from 'zustand';
import { IUser } from '@/types';
import { authApi, LoginPayload, RegisterPayload } from '@/api/auth';
import { usersApi } from '@/api/users';
import toast from 'react-hot-toast';

interface AuthState {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  socialLogin: (idToken: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  setUser: (user: IUser) => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('bazaaro_token'),
  isAuthenticated: !!localStorage.getItem('bazaaro_token'),
  isLoading: false,

  initialize: () => {
    const token = localStorage.getItem('bazaaro_token');
    const userStr = localStorage.getItem('bazaaro_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true });
      } catch {
        localStorage.removeItem('bazaaro_token');
        localStorage.removeItem('bazaaro_user');
        set({ user: null, token: null, isAuthenticated: false });
      }
    }
  },

  login: async (payload) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.login(payload);
      const { token, user } = data;
      localStorage.setItem('bazaaro_token', token);
      localStorage.setItem('bazaaro_user', JSON.stringify(user));
      set({ user: user as unknown as IUser, token, isAuthenticated: true, isLoading: false });
      toast.success(`Welcome back, ${user.name}!`);
    } catch {
      set({ isLoading: false });
      throw new Error('Login failed');
    }
  },

  register: async (payload) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.register(payload);
      const { token, user } = data;
      localStorage.setItem('bazaaro_token', token);
      localStorage.setItem('bazaaro_user', JSON.stringify(user));
      set({ user: user as unknown as IUser, token, isAuthenticated: true, isLoading: false });
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
      localStorage.setItem('bazaaro_token', token);
      localStorage.setItem('bazaaro_user', JSON.stringify(user));
      set({ user: user as unknown as IUser, token, isAuthenticated: true, isLoading: false });
      toast.success(`Welcome, ${user.name}!`);
    } catch {
      set({ isLoading: false });
      throw new Error('Social login failed');
    }
  },

  logout: () => {
    localStorage.removeItem('bazaaro_token');
    localStorage.removeItem('bazaaro_user');
    set({ user: null, token: null, isAuthenticated: false });
    toast.success('Logged out successfully');
  },

  fetchUser: async () => {
    if (!get().token) return;
    try {
      const { data } = await usersApi.getMe();
      const user = data.user;
      localStorage.setItem('bazaaro_user', JSON.stringify(user));
      set({ user });
    } catch {
      get().logout();
    }
  },

  setUser: (user) => {
    localStorage.setItem('bazaaro_user', JSON.stringify(user));
    set({ user });
  },
}));
