import apiClient from './client';

export interface PublicAppSettings {
  paymentsEnabled: boolean;
  paymentsDisabledMessage: string;
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  maintenanceGraceSeconds: number;
}

export const settingsApi = {
  getPublicSettings: () => apiClient.get<{ success: boolean; data: PublicAppSettings }>('/settings'),
};
