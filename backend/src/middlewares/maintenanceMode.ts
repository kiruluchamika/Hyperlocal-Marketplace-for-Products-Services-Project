import { NextFunction, Request, Response } from "express";
import { getPublicAppSettings } from "../services/appSettingsService";
import { AppError } from "../utils/AppError";

const ALLOWED_PATHS_DURING_MAINTENANCE: RegExp[] = [
  /^\/api\/auth\/admin\/login$/,
  /^\/api\/settings$/,
  /^\/api\/settings\/$/,
  /^\/api\/payments\/webhook\/stripe$/,
  /^\/api\/admin(\/.*)?$/,
  /^\/api-docs(\/.*)?$/,
  /^\/swagger(\/.*)?$/,
  /^\/docs(\/.*)?$/,
  /^\/swagger\.json$/,
];

const isAllowedMaintenancePath = (path: string) => {
  return ALLOWED_PATHS_DURING_MAINTENANCE.some((pattern) => pattern.test(path));
};

export const maintenanceModeGuard = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const settings = await getPublicAppSettings();

    if (!settings.maintenanceEnabled) {
      return next();
    }

    if (req.user?.role === "admin") {
      return next();
    }

    if (isAllowedMaintenancePath(req.path)) {
      return next();
    }

    return next(
      new AppError(settings.maintenanceMessage, 503, {
        code: "MAINTENANCE_MODE",
        maintenanceEnabled: true,
        maintenanceGraceSeconds: settings.maintenanceGraceSeconds,
      })
    );
  } catch (error) {
    return next(error);
  }
};
