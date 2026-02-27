import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendOtp, verifyOtp } from "../services/otpService";

export const sendOtpCode = asyncHandler(async (req: Request, res: Response) => {
  const result = await sendOtp(req.body);
  res.status(200).json(result);
});

export const verifyOtpCode = asyncHandler(async (req: Request, res: Response) => {
  const result = await verifyOtp(req.body);
  res.status(200).json(result);
});
