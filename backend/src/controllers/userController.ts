import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import {
  changeUserPassword,
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
