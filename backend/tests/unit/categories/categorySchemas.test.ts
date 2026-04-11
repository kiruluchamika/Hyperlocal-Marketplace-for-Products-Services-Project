import { describe, expect, it } from "vitest";
import {
  categoryIdParamSchema,
  createCategorySchema,
  getCategoriesQuerySchema,
  updateCategorySchema
} from "../../../src/validators/categorySchemas";

describe("categorySchemas", () => {
  it("parses a valid create payload and applies defaults", () => {
    const parsed = createCategorySchema.parse({
      name: "  Electronics  ",
      type: "PRODUCT",
      description: "  Devices and accessories  ",
      image: "image.png"
    });

    expect(parsed).toEqual({
      name: "Electronics",
      type: "PRODUCT",
      description: "Devices and accessories",
      image: "image.png",
      attributes: [],
      isActive: true
    });
  });

  it("rejects select attributes without options", () => {
    const result = createCategorySchema.safeParse({
      name: "Fashion",
      type: "PRODUCT",
      image: "image.png",
      attributes: [
        {
          fieldName: "Size",
          fieldType: "select"
        }
      ]
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["attributes", 0, "options"]);
      expect(result.error.issues[0]?.message).toContain("options array is required");
    }
  });

  it("rejects an empty update payload", () => {
    const result = updateCategorySchema.safeParse({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("At least one field is required for update");
    }
  });

  it("validates category id params using ObjectId format", () => {
    expect(() =>
      categoryIdParamSchema.parse({ id: "invalid-id" })
    ).toThrowError("Invalid category id");

    expect(
      categoryIdParamSchema.parse({ id: "507f1f77bcf86cd799439011" })
    ).toEqual({ id: "507f1f77bcf86cd799439011" });
  });

  it("coerces and transforms category list query parameters", () => {
    const parsed = getCategoriesQuerySchema.parse({
      type: "SERVICE",
      isActive: "false",
      search: "home",
      page: "2",
      limit: "10"
    });

    expect(parsed).toEqual({
      type: "SERVICE",
      isActive: false,
      search: "home",
      page: 2,
      limit: 10
    });
  });
});
