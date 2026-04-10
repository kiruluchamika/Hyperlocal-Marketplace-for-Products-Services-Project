import { create } from 'zustand';
import { settingsApi, type PublicAppSettings } from '@/api/settings';

const DEFAULT_SETTINGS: PublicAppSettings = {
  paymentsEnabled: true,
  paymentsDisabledMessage: 'Online payments are temporarily unavailable. Please contact seller or try later.',
  maintenanceEnabled: false,
  maintenanceMessage:
    "We're currently performing scheduled maintenance to improve your experience. The site will be back shortly. Thank you for your patience.",
  maintenanceGraceSeconds: 60,
};

const POLL_INTERVAL_MS = 15_000;
let pollingTimer: ReturnType<typeof setInterval> | null = null;

interface SiteSettingsState {
  settings: PublicAppSettings;
  isLoading: boolean;
  fetchPublicSettings: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  applyPublicSettings: (next: PublicAppSettings) => void;
}

export const useSiteSettingsStore = create<SiteSettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: true,

  applyPublicSettings: (next) => {
    set({ settings: next, isLoading: false });
  },

  fetchPublicSettings: async () => {
    try {
      const { data } = await settingsApi.getPublicSettings();
      set({ settings: data.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  startPolling: () => {
    void get().fetchPublicSettings();

    if (pollingTimer) {
      return;
    }

    pollingTimer = setInterval(() => {
      void get().fetchPublicSettings();
    }, POLL_INTERVAL_MS);
  },

  stopPolling: () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  },
}));
