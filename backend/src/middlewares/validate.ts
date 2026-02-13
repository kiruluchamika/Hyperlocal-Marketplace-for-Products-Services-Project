import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

type Source = "body" | "params" | "query";

export const validate = (schema: ZodSchema, source: Source = "body") => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(result.error);
    }
    req[source] = result.data as never;
    return next();
  };
};
