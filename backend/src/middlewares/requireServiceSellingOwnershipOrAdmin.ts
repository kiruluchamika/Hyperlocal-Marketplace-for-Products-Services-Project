import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { canModifyServiceSelling } from "../services/serviceSellingService";

export const requireServiceSellingOwnershipOrAdmin = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401));
  }

  const allowed = await canModifyServiceSelling(
    req.params.id,
    req.user.id,
    req.user.role as any
  );

  if (!allowed) {
    return next(new AppError("Forbidden", 403));
  }

  return next();
};
