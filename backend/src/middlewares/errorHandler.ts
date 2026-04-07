import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const bodyParserError = err as Error & { type?: string; status?: number; statusCode?: number };

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation error",
      errors: err.issues
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      errors: err.details
    });
  }

  if (bodyParserError.type === "entity.too.large" || bodyParserError.status === 413 || bodyParserError.statusCode === 413) {
    return res.status(413).json({
      message: "Request payload is too large. Reduce the number or size of uploaded images and try again."
    });
  }

  console.error(err);
  return res.status(500).json({ message: "Server error" });
};
