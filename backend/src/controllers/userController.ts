import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  changeUserPassword,
  getStripeConnectBalanceForUser,
  createStripeConnectOnboardingLink,
  getStripeConnectStatusForUser,
  getUserById,
  listUsers,
  sanitizeUserProfile,
  updateUserProfile
} from "../services/userService";
import { AppError } from "../utils/AppError";

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }
  const user = await getUserById(req.user.id);
  res.status(200).json({ user: sanitizeUserProfile(user) });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const updated = await updateUserProfile(req.user.id, req.body);
  res.status(200).json({
    message: "Profile updated successfully",
    user: sanitizeUserProfile(updated)
  });
});

export const changeMyPassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  await changeUserPassword(req.user.id, req.body);
  res.status(200).json({ message: "Password changed successfully" });
});

export const getAllUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await listUsers();
  const sanitized = users.map((user) => sanitizeUserProfile(user));
  res.status(200).json({ users: sanitized });
});

export const createStripeConnectOnboarding = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const result = await createStripeConnectOnboardingLink({
    userId: req.user.id,
    returnUrl: req.body.returnUrl,
    refreshUrl: req.body.refreshUrl,
  });

  res.status(200).json({
    success: true,
    message: "Stripe Connect onboarding link created",
    data: result,
  });
});

export const getStripeConnectStatus = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const status = await getStripeConnectStatusForUser(req.user.id);

  res.status(200).json({
    success: true,
    data: status,
  });
});

export const getStripeConnectBalance = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const balance = await getStripeConnectBalanceForUser(req.user.id);

  res.status(200).json({
    success: true,
    data: balance,
  });
});
