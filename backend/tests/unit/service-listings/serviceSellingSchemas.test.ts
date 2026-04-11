import { describe, expect, it } from "vitest";
import {
  createServiceSellingSchema,
  listServiceSellingQuerySchema,
  updateServiceSellingSchema,
} from "../../../src/validators/serviceSellingSchemas";

describe("serviceSellingSchemas", () => {
  it("parses a valid create payload and applies defaults", () => {
    const parsed = createServiceSellingSchema.parse({
      title: "Home Cleaning",
      categoryId: "507f1f77bcf86cd799439011",
      price: 2500,
      pricingType: "FIXED",
      locationText: "Colombo",
      location: {
        city: "Colombo",
      },
    });

    expect(parsed).toEqual({
      title: "Home Cleaning",
      description: "",
      categoryId: "507f1f77bcf86cd799439011",
      price: 2500,
      pricingType: "FIXED",
      locationText: "Colombo",
      location: {
        city: "Colombo",
      },
      images: [],
      attributeValues: {},
    });
  });

  it("rejects invalid coordinates in create payloads", () => {
    const result = createServiceSellingSchema.safeParse({
      title: "Electrical Repairs",
      categoryId: "507f1f77bcf86cd799439011",
      price: 5000,
      pricingType: "HOURLY",
      locationText: "Kandy",
      location: {
        city: "Kandy",
        coordinates: {
          type: "Point",
          coordinates: [181, 7.2906],
        },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Invalid coordinates. Use [lng, lat].");
      expect(result.error.issues[0]?.path).toEqual(["location", "coordinates", "coordinates"]);
    }
  });

  it("allows partial updates", () => {
    expect(
      updateServiceSellingSchema.parse({
        title: "Updated Service Title",
      })
    ).toEqual({ title: "Updated Service Title" });
  });

  it("coerces list query values and enforces page-size limits", () => {
    const parsed = listServiceSellingQuerySchema.parse({
      search: "cleaning",
      minPrice: "1000",
      maxPrice: "5000",
      page: "2",
      limit: "25",
      pricingType: "FIXED",
    });

    expect(parsed).toEqual({
      search: "cleaning",
      minPrice: 1000,
      maxPrice: 5000,
      page: 2,
      limit: 25,
      pricingType: "FIXED",
    });

    const invalid = listServiceSellingQuerySchema.safeParse({
      limit: "100",
    });

    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.path).toEqual(["limit"]);
    }
  });
});
