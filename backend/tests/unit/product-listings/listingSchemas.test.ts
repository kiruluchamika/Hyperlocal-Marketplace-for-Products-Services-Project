import { describe, expect, it } from "vitest";
import {
  createListingSchema,
  listListingsQuerySchema,
  listingIdParamSchema,
  updateListingSchema
} from "../../../src/validators/listingSchemas";

describe("listingSchemas", () => {
  it("parses a valid create payload and applies defaults", () => {
    const parsed = createListingSchema.parse({
      title: "Vintage Camera",
      description: "A well-kept film camera in excellent working condition.",
      categoryId: "507f1f77bcf86cd799439011",
      price: 45000,
      location: {
        city: "Colombo"
      }
    });

    expect(parsed).toEqual({
      title: "Vintage Camera",
      description: "A well-kept film camera in excellent working condition.",
      categoryId: "507f1f77bcf86cd799439011",
      price: 45000,
      transactionMode: "BUY_NOW",
      images: [],
      location: {
        city: "Colombo"
      }
    });
  });

  it("rejects invalid category ids on create", () => {
    const result = createListingSchema.safeParse({
      title: "Desk",
      description: "Solid wood desk in good condition for home office use.",
      categoryId: "bad-id",
      price: 12000,
      location: {
        city: "Kandy"
      }
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["categoryId"]);
      expect(result.error.issues[0]?.message).toContain("Invalid category ID format");
    }
  });

  it("rejects an empty update payload", () => {
    const result = updateListingSchema.safeParse({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("At least one field is required for update");
    }
  });

  it("validates listing id params with ObjectId format", () => {
    expect(() =>
      listingIdParamSchema.parse({ id: "invalid-id" })
    ).toThrowError("Invalid listing id");

    expect(
      listingIdParamSchema.parse({ id: "507f1f77bcf86cd799439011" })
    ).toEqual({ id: "507f1f77bcf86cd799439011" });
  });

  it("coerces query params and rejects inverted price ranges", () => {
    const parsed = listListingsQuerySchema.parse({
      search: "camera",
      minPrice: "1000",
      maxPrice: "5000",
      page: "2",
      limit: "15"
    });

    expect(parsed).toEqual({
      search: "camera",
      minPrice: 1000,
      maxPrice: 5000,
      page: 2,
      limit: 15
    });

    const invalid = listListingsQuerySchema.safeParse({
      minPrice: "9000",
      maxPrice: "3000"
    });

    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toBe("minPrice must be less than or equal to maxPrice");
    }
  });
});
