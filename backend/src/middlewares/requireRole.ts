import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

type Role = "admin" | "seller" | "buyer";

export const requireRole = (roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!roles.includes(req.user.role as Role)) {
      return next(new AppError("Forbidden", 403));
    }

    return next();
  };
};
