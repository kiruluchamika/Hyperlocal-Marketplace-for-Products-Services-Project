import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

/**
 * Order Validation Middleware
 * 
 * Handles validation for order endpoints which have {body, params, query} structure
 * This is separate from the global validate middleware to avoid breaking other routes
 */
export const validateOrder = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Parse the full request object (body, params, query)
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });
    
    if (!result.success) {
      return next(result.error);
    }
    
    // Update request with validated data
    const { body, params, query } = result.data as any;
    if (body) req.body = body;
    if (params) req.params = params;
    if (query) req.query = query;
    
    return next();
  };
};
