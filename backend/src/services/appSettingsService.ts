import AppSettings, { AppSettingsDocument, IAppSettings } from "../models/AppSettings";
import { AppError } from "../utils/AppError";

type PublicSettings = {
  paymentsEnabled: boolean;
  paymentsDisabledMessage: string;
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  maintenanceGraceSeconds: number;
};

type AdminSettings = PublicSettings & {
  updatedAt: Date;
  updatedBy?: string;
};

type UpdateSettingsInput = Partial<{
  paymentsEnabled: boolean;
  paymentsDisabledMessage: string;
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  maintenanceGraceSeconds: number;
}>;

const DEFAULT_SETTINGS: PublicSettings = {
  paymentsEnabled: true,
  paymentsDisabledMessage: "Online payments are temporarily unavailable. Please contact seller or try later.",
  maintenanceEnabled: false,
  maintenanceMessage:
    "We're currently performing scheduled maintenance to improve your experience. The site will be back shortly. Thank you for your patience.",
  maintenanceGraceSeconds: 60,
};

const SETTINGS_CACHE_TTL_MS = 10_000;

let cachedSettings: AppSettingsDocument | null = null;
let cachedAt = 0;

const toPublicSettings = (settings: IAppSettings): PublicSettings => ({
  paymentsEnabled: settings.paymentsEnabled,
  paymentsDisabledMessage: settings.paymentsDisabledMessage,
  maintenanceEnabled: settings.maintenanceEnabled,
  maintenanceMessage: settings.maintenanceMessage,
  maintenanceGraceSeconds: settings.maintenanceGraceSeconds,
});

const toAdminSettings = (settings: IAppSettings): AdminSettings => ({
  ...toPublicSettings(settings),
  updatedAt: settings.updatedAt,
  updatedBy: settings.updatedBy ? String(settings.updatedBy) : undefined,
});

const shouldUseCache = () => {
  return cachedSettings !== null && Date.now() - cachedAt < SETTINGS_CACHE_TTL_MS;
};

const setCache = (settings: AppSettingsDocument) => {
  cachedSettings = settings;
  cachedAt = Date.now();
};

const getOrCreateSettings = async (forceFresh = false): Promise<AppSettingsDocument> => {
  if (!forceFresh && shouldUseCache()) {
    return cachedSettings as AppSettingsDocument;
  }

  let settings = await AppSettings.findOne({ key: "GLOBAL" });

  if (!settings) {
    settings = await AppSettings.create({
      key: "GLOBAL",
      ...DEFAULT_SETTINGS,
    });
  }

  const hydratedSettings = settings as AppSettingsDocument;
  setCache(hydratedSettings);
  return hydratedSettings;
};

export const getPublicAppSettings = async (): Promise<PublicSettings> => {
  const settings = await getOrCreateSettings();
  return toPublicSettings(settings);
};

export const getAdminAppSettings = async (): Promise<AdminSettings> => {
  const settings = await getOrCreateSettings();
  return toAdminSettings(settings);
};

export const updateAdminAppSettings = async (
  input: UpdateSettingsInput,
  adminId: string
): Promise<AdminSettings> => {
  const settings = await getOrCreateSettings(true);

  if (typeof input.paymentsEnabled === "boolean") {
    settings.paymentsEnabled = input.paymentsEnabled;
  }

  if (typeof input.paymentsDisabledMessage === "string") {
    settings.paymentsDisabledMessage = input.paymentsDisabledMessage.trim() || DEFAULT_SETTINGS.paymentsDisabledMessage;
  }

  if (typeof input.maintenanceEnabled === "boolean") {
    settings.maintenanceEnabled = input.maintenanceEnabled;
  }

  if (typeof input.maintenanceMessage === "string") {
    settings.maintenanceMessage = input.maintenanceMessage.trim() || DEFAULT_SETTINGS.maintenanceMessage;
  }

  if (typeof input.maintenanceGraceSeconds === "number" && Number.isFinite(input.maintenanceGraceSeconds)) {
    const bounded = Math.max(10, Math.min(600, Math.round(input.maintenanceGraceSeconds)));
    settings.maintenanceGraceSeconds = bounded;
  }

  settings.updatedBy = adminId as any;
  await settings.save();
  setCache(settings);

  return toAdminSettings(settings);
};

export const assertPaymentsEnabled = async () => {
  const settings = await getPublicAppSettings();

  if (!settings.paymentsEnabled) {
    throw new AppError(settings.paymentsDisabledMessage, 503, {
      code: "PAYMENTS_DISABLED",
      paymentsEnabled: false,
    });
  }
};
