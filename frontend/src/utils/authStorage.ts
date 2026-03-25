import { IUser } from '@/types';

const TOKEN_KEY = 'bazaaro_token';
const USER_KEY = 'bazaaro_user';

const readStorage = (storage: Storage) => ({
  token: storage.getItem(TOKEN_KEY),
  user: storage.getItem(USER_KEY),
});

const clearLegacyLocalStorage = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const authStorage = {
  getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
  },

  getUser() {
    return sessionStorage.getItem(USER_KEY);
  },

  persistSession(token: string, user: IUser) {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    clearLegacyLocalStorage();
  },

  setUser(user: IUser) {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    clearLegacyLocalStorage();
  },

  migrateLegacySession() {
    const current = readStorage(sessionStorage);
    if (current.token || current.user) {
      clearLegacyLocalStorage();
      return current;
    }

    const legacy = readStorage(localStorage);
    if (legacy.token) {
      sessionStorage.setItem(TOKEN_KEY, legacy.token);
    }
    if (legacy.user) {
      sessionStorage.setItem(USER_KEY, legacy.user);
    }
    clearLegacyLocalStorage();

    return {
      token: legacy.token,
      user: legacy.user,
    };
  },
};
