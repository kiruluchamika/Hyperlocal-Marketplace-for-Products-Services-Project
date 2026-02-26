import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { registerUser, loginUser, loginWithGoogle } from "../services/authService";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await registerUser(req.body);
  res.status(201).json(result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await loginUser(req.body);
  res.status(200).json(result);
});

export const googleSocialLogin = asyncHandler(async (req: Request, res: Response) => {
  const result = await loginWithGoogle(req.body);
  res.status(200).json(result);
});
