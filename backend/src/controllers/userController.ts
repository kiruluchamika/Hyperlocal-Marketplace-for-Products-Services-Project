import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getUserById, listUsers } from "../services/userService";
import { AppError } from "../utils/AppError";

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }
  const user = await getUserById(req.user.id);
  res.status(200).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });
});

export const getAllUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await listUsers();
  const sanitized = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  }));
  res.status(200).json(sanitized);
});
