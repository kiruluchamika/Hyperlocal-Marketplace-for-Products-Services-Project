import axios from 'axios';
import toast from 'react-hot-toast';
import { authStorage } from '@/utils/authStorage';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = authStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'Something went wrong';
    const errorCode = error.response?.data?.errors?.code as string | undefined;

    if (error.response?.status === 401) {
      authStorage.clearSession();
      const isAdminPath = window.location.pathname.startsWith('/admin');
      const authPath = isAdminPath ? '/admin/login' : '/login';

      // Only redirect if not already on auth pages
      if (
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/register')
      ) {
        window.location.href = authPath;
      }
    }

    if (error.response?.status !== 401) {
      toast.error(message);
    }

    if (error.response?.status === 503 && errorCode === 'MAINTENANCE_MODE') {
      if (window.location.pathname !== '/maintenance') {
        window.location.href = '/maintenance';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
