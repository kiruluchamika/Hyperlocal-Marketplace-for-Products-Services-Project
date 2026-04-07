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
  image: z.string().min(5, "image is required"),
  attributes: z.array(attributeSchema).optional().default([]),
  isActive: z.boolean().optional().default(true)
});

export const updateCategorySchema = z
  .object({
    name: z.string().min(3, "name must be at least 3 characters").max(100, "name must not exceed 100 characters").trim().optional(),
    type: z.enum(["PRODUCT", "SERVICE"]).optional(),
    description: z.string().max(500, "description must not exceed 500 characters").trim().optional(),
    image: z.string().min(5, "image must be a valid image string").optional(),
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

/**
 * ✅ ENHANCED CATEGORY VALIDATION SCHEMAS
 */

/**
 * Validation for bulk category operations
 */
export const bulkCreateCategoriesSchema = z.object({
  categories: z.array(createCategorySchema)
    .min(1, "At least 1 category is required")
    .max(100, "Maximum 100 categories can be created in bulk")
});

/**
 * Validation for category name uniqueness check
 */
export const checkCategoryNameSchema = z.object({
  name: z.string().min(3, "name must be at least 3 characters").max(100, "name must not exceed 100 characters").trim(),
  type: z.enum(["PRODUCT", "SERVICE"]),
  parentCategoryId: z.string().regex(objectIdRegex, "Invalid parent category ID").optional().nullable(),
  excludeId: z.string().regex(objectIdRegex, "Invalid category ID").optional()
});

/**
 * Validation for adding attributes to existing category
 */
export const addAttributesSchema = z.object({
  categoryId: z.string().regex(objectIdRegex, "Invalid category ID"),
  attributes: z.array(attributeSchema)
    .min(1, "At least 1 attribute is required")
    .max(10, "Maximum 10 attributes per category")
});

/**
 * Validation for attribute modification
 */
export const updateAttributeSchema = z.object({
  categoryId: z.string().regex(objectIdRegex, "Invalid category ID"),
  attributeIndex: z.number().int().min(0),
  updatedAttribute: attributeSchema
});

/**
 * Validation for removing attribute from category
 */
export const removeAttributeSchema = z.object({
  categoryId: z.string().regex(objectIdRegex, "Invalid category ID"),
  attributeIndex: z.number().int().min(0).max(10)
});

/**
 * Validation for category status operations
 */
export const categoryStatusChangeSchema = z.object({
  categoryId: z.string().regex(objectIdRegex, "Invalid category ID"),
  isActive: z.boolean(),
  force: z.boolean().default(false)
});

/**
 * Validation for moving category to another parent
 */
export const moveCategorySchema = z.object({
  categoryId: z.string().regex(objectIdRegex, "Invalid category ID"),
  newParentId: z.string().regex(objectIdRegex, "Invalid parent category ID").nullable().optional(),
  updateChildren: z.boolean().default(false)
});

/**
 * Validation for category metadata updates
 */
export const updateCategoryMetadataSchema = z.object({
  categoryId: z.string().regex(objectIdRegex, "Invalid category ID"),
  metadata: z.object({
    imageUrl: z.string().url("Invalid image URL").optional(),
    color: z.string()
      .refine(
        (color) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color),
        "Invalid hex color format (e.g., #FF5733)"
      )
      .optional(),
    priority: z.number().min(0).max(1000).default(0),
    icon: z.string().emoji("Invalid emoji").or(z.string().url()).optional()
  })
});

/**
 * Validation for category search with advanced filters
 */
export const advancedCategorySearchSchema = z.object({
  search: z.string().min(1).max(100).optional(),
  type: z.enum(["PRODUCT", "SERVICE"]).optional(),
  isActive: z.boolean().optional(),
  parentCategoryId: z.string().regex(objectIdRegex, "Invalid parent ID").optional(),
  minAttributeCount: z.number().int().min(0).optional(),
  maxAttributeCount: z.number().int().min(0).optional(),
  sortBy: z.enum(["name", "createdAt", "updatedAt", "-name", "-createdAt", "-updatedAt"]).default("-createdAt"),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
});

/**
 * Validation for attribute-based filtering in products
 */
export const categoryAttributeFilterSchema = z.object({
  categoryId: z.string().regex(objectIdRegex, "Invalid category ID"),
  filters: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])
  ).optional()
});
