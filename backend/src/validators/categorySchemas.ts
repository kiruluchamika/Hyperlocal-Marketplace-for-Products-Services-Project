import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const attributeSchema = z.object({
  fieldName: z.string().min(1, "fieldName is required"),
  fieldType: z.enum(["string", "number", "boolean", "select"], {
    errorMap: () => ({ message: "fieldType must be one of: string, number, boolean, select" })
  }),
  required: z.boolean().optional().default(false),
  options: z.array(z.string().min(1)).optional()
}).refine(
  (data) => data.fieldType !== "select" || (data.options && data.options.length > 0),
  {
    message: "options array is required and must not be empty when fieldType is 'select'",
    path: ["options"]
  }
);

export const createCategorySchema = z.object({
  name: z.string().min(3, "name must be at least 3 characters").max(100, "name must not exceed 100 characters").trim(),
  type: z.enum(["PRODUCT", "SERVICE"], {
    errorMap: () => ({ message: "type must be either PRODUCT or SERVICE" })
  }),
  description: z.string().max(500, "description must not exceed 500 characters").trim().optional(),
  attributes: z.array(attributeSchema).optional().default([]),
  isActive: z.boolean().optional().default(true)
});

export const updateCategorySchema = z
  .object({
    name: z.string().min(3, "name must be at least 3 characters").max(100, "name must not exceed 100 characters").trim().optional(),
    type: z.enum(["PRODUCT", "SERVICE"]).optional(),
    description: z.string().max(500, "description must not exceed 500 characters").trim().optional(),
    attributes: z.array(attributeSchema).optional(),
    isActive: z.boolean().optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required for update"
  });

export const categoryIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, "Invalid category id")
});

export const getCategoriesQuerySchema = z.object({
  type: z.enum(["PRODUCT", "SERVICE"]).optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => val === "true" ? true : val === "false" ? false : undefined),
  search: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});
