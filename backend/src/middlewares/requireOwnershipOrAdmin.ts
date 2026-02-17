import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { canModifyListing } from "../services/listingService";

export const requireOwnershipOrAdmin = async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401));
  }

  const allowed = await canModifyListing(req.params.id, req.user.id, req.user.role);

  if (!allowed) {
    return next(new AppError("Forbidden", 403));
  }

  return next();
};
