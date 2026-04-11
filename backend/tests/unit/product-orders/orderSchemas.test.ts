import { describe, expect, it } from "vitest";
import {
  confirmReceivedWithOtpSchema,
  createOrderSchema,
  listOrdersSchema,
  updateDeliveryDetailsSchema
} from "../../../src/validators/orderSchemas";

describe("orderSchemas", () => {
  it("parses a pickup order request and applies the default quantity", () => {
    const parsed = createOrderSchema.parse({
      body: {
        listingId: "507f1f77bcf86cd799439011",
        deliveryMethod: "PICKUP"
      }
    });

    expect(parsed.body).toEqual({
      listingId: "507f1f77bcf86cd799439011",
      quantity: 1,
      deliveryMethod: "PICKUP"
    });
  });

  it("requires a delivery address when the delivery method is DELIVERY", () => {
    const result = createOrderSchema.safeParse({
      body: {
        listingId: "507f1f77bcf86cd799439011",
        quantity: 2,
        deliveryMethod: "DELIVERY"
      }
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["body", "deliveryAddress"]);
      expect(result.error.issues[0]?.message).toBe(
        "Delivery address is required when delivery method is DELIVERY"
      );
    }
  });

  it("validates OTP payloads for buyer confirmation", () => {
    const result = confirmReceivedWithOtpSchema.safeParse({
      params: { id: "507f1f77bcf86cd799439011" },
      body: { otp: "12ab56" }
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["body", "otp"]);
      expect(result.error.issues[0]?.message).toBe("OTP must contain only digits");
    }
  });

  it("coerces list query pagination values and validates delivery detail updates", () => {
    const parsedQuery = listOrdersSchema.parse({
      query: {
        status: "PENDING",
        page: "2",
        limit: "25"
      }
    });

    expect(parsedQuery.query).toEqual({
      status: "PENDING",
      page: 2,
      limit: 25
    });

    const invalidUpdate = updateDeliveryDetailsSchema.safeParse({
      params: { id: "507f1f77bcf86cd799439011" },
      body: {
        deliveryMethod: "DELIVERY",
        deliveryAddress: "Too short"
      }
    });

    expect(invalidUpdate.success).toBe(false);
    if (!invalidUpdate.success) {
      expect(invalidUpdate.error.issues[0]?.path).toEqual(["body", "deliveryAddress"]);
      expect(invalidUpdate.error.issues[0]?.message).toBe(
        "Delivery address must be at least 10 characters"
      );
    }
  });
});
