import { NextFunction, Request, Response } from "express";
import { assertPaymentsEnabled } from "../services/appSettingsService";

export const requirePaymentsEnabled = async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await assertPaymentsEnabled();
    return next();
  } catch (error) {
    return next(error);
  }
};
