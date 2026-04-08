import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getPublicAppSettings } from "../services/appSettingsService";

export const getPublicSettings = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getPublicAppSettings();

  res.json({
    success: true,
    data,
  });
});
