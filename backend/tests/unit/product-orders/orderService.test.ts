import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../../src/utils/AppError";

const { productListingModelMock, orderModelMock, paymentModelMock, paymentServiceMock, emailServiceMock, bcryptMock } =
  vi.hoisted(() => ({
    productListingModelMock: {
      findById: vi.fn()
    },
    orderModelMock: {
      create: vi.fn(),
      findById: vi.fn()
    },
    paymentModelMock: {
      findById: vi.fn(),
      findOne: vi.fn()
    },
    paymentServiceMock: {
      refundPayment: vi.fn(),
      releasePayment: vi.fn()
    },
    emailServiceMock: {
      sendOTP: vi.fn().mockResolvedValue(undefined)
    },
    bcryptMock: {
      hash: vi.fn(),
      compare: vi.fn()
    }
  }));

vi.mock("../../../src/config/env", () => ({
  env: {
    ENABLE_OTP_DELIVERY: "true",
    OTP_EXPIRY_MINUTES: "30"
  }
}));

vi.mock("bcryptjs", () => ({
  default: bcryptMock
}));

vi.mock("../../../src/models/ProductListing", () => ({
  default: productListingModelMock
}));

vi.mock("../../../src/models/Order", () => ({
  default: orderModelMock,
  OrderStatus: {
    PENDING: "PENDING",
    ACCEPTED: "ACCEPTED",
    REJECTED: "REJECTED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED"
  },
  DeliveryMethod: {
    PICKUP: "PICKUP",
    DELIVERY: "DELIVERY"
  }
}));

vi.mock("../../../src/models/Payment", () => ({
  default: paymentModelMock,
  PaymentStatus: {
    INITIATED: "INITIATED",
    HELD: "HELD",
    RELEASED: "RELEASED",
    REFUNDED: "REFUNDED",
    FAILED: "FAILED"
  }
}));

vi.mock("../../../src/services/paymentService", () => ({
  PaymentService: vi.fn().mockImplementation(function PaymentService() {
    return paymentServiceMock;
  })
}));

vi.mock("../../../src/services/emailService", () => ({
  EmailService: vi.fn().mockImplementation(function EmailService() {
    return emailServiceMock;
  })
}));

import { OrderService } from "../../../src/services/orderService";

const buyerId = "507f1f77bcf86cd799439012";
const sellerId = "507f1f77bcf86cd799439013";
const listingId = "507f1f77bcf86cd799439011";
const orderId = "507f1f77bcf86cd799439099";

const makeOrderDoc = (overrides: Record<string, unknown> = {}) => ({
  _id: { toString: () => orderId },
  buyerId: { toString: () => buyerId },
  sellerId: { toString: () => sellerId },
  paymentId: { toString: () => "payment-1" },
  status: "PENDING",
  deliveryMethod: "PICKUP",
  deliveryAddress: undefined,
  deliveryOtpHash: "stored-hash",
  deliveryOtpExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
  deliveryOtpAttempts: 0,
  titleSnapshot: "Gaming Laptop",
  save: vi.fn().mockResolvedValue(undefined),
  populate: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("OrderService", () => {
  it("creates a pickup order with snapshot data from the listing", async () => {
    const service = new OrderService();
    const listing = {
      _id: listingId,
      ownerId: { toString: () => sellerId },
      type: "PRODUCT",
      transactionMode: "BUY_NOW",
      status: "ACTIVE",
      title: "Gaming Laptop",
      price: 250000,
      location: {
        address: "12 Temple Road",
        city: "Colombo"
      }
    };
    const createdOrder = makeOrderDoc();

    productListingModelMock.findById.mockResolvedValue(listing);
    orderModelMock.create.mockResolvedValue(createdOrder);

    const result = await service.createOrder(buyerId, {
      listingId,
      quantity: 2,
      deliveryMethod: "PICKUP" as never
    });

    expect(productListingModelMock.findById).toHaveBeenCalledWith(listingId);
    expect(orderModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerId,
        sellerId: listing.ownerId,
        listingId,
        titleSnapshot: "Gaming Laptop",
        unitPriceSnapshot: 250000,
        quantity: 2,
        totalAmount: 500000,
        deliveryMethod: "PICKUP",
        pickupLocationSnapshot: "12 Temple Road, Colombo",
        status: "PENDING"
      })
    );
    expect(result).toEqual({
      order: createdOrder,
      message: "Order created successfully. Please proceed to payment.",
      nextStep: "INITIATE_PAYMENT"
    });
  });

  it("prevents buyers from ordering their own listing", async () => {
    const service = new OrderService();

    productListingModelMock.findById.mockResolvedValue({
      _id: listingId,
      ownerId: { toString: () => buyerId },
      type: "PRODUCT",
      transactionMode: "BUY_NOW",
      status: "ACTIVE",
      price: 1000
    });

    await expect(
      service.createOrder(buyerId, {
        listingId,
        quantity: 1,
        deliveryMethod: "PICKUP" as never
      })
    ).rejects.toMatchObject<AppError>({
      message: "You cannot order your own listing",
      statusCode: 400
    });

    expect(orderModelMock.create).not.toHaveBeenCalled();
  });

  it("cancels pending orders and refunds the associated payment", async () => {
    const service = new OrderService();
    const order = makeOrderDoc();

    orderModelMock.findById.mockResolvedValue(order);

    const result = await service.cancelOrder(orderId, buyerId, "Buyer requested cancellation");

    expect(order.status).toBe("CANCELLED");
    expect(order.save).toHaveBeenCalledTimes(1);
    expect(paymentServiceMock.refundPayment).toHaveBeenCalledWith(orderId);
    expect(result.message).toContain("Buyer requested cancellation");
  });

  it("requires OTP confirmation for in-progress orders when OTP delivery is enabled", async () => {
    const service = new OrderService();
    const order = makeOrderDoc({
      status: "IN_PROGRESS",
      deliveryOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    orderModelMock.findById.mockResolvedValue(order);

    await expect(service.confirmReceived(orderId, buyerId)).rejects.toMatchObject<AppError>({
      message: "OTP confirmation is required. Use confirm-received-otp endpoint.",
      statusCode: 400
    });

    expect(paymentServiceMock.releasePayment).not.toHaveBeenCalled();
  });

  it("tracks failed OTP attempts and does not release payment on invalid buyer OTP", async () => {
    const service = new OrderService();
    const order = makeOrderDoc({
      status: "IN_PROGRESS",
      deliveryOtpAttempts: 0
    });
    const selectMock = vi.fn().mockResolvedValue(order);

    orderModelMock.findById.mockReturnValue({ select: selectMock });
    bcryptMock.compare.mockResolvedValue(false);

    await expect(
      service.confirmReceivedWithOtp(orderId, buyerId, "123456")
    ).rejects.toMatchObject<AppError>({
      message: "Invalid OTP. 2 attempts remaining.",
      statusCode: 400
    });

    expect(selectMock).toHaveBeenCalledWith("+deliveryOtpHash");
    expect(order.deliveryOtpAttempts).toBe(1);
    expect(order.save).toHaveBeenCalledTimes(1);
    expect(paymentServiceMock.releasePayment).not.toHaveBeenCalled();
  });

  it("blocks delivery detail updates once payment is already confirmed", async () => {
    const service = new OrderService();
    const order = makeOrderDoc({
      _id: { toString: () => orderId },
      status: "PENDING"
    });

    orderModelMock.findById.mockResolvedValue(order);
    paymentModelMock.findOne.mockResolvedValue({
      status: "HELD"
    });

    await expect(
      service.updateDeliveryDetails(orderId, buyerId, {
        deliveryMethod: "DELIVERY" as never,
        deliveryAddress: "45 Flower Road, Colombo"
      })
    ).rejects.toMatchObject<AppError>({
      message: "Cannot update delivery details after payment is confirmed",
      statusCode: 400
    });

    expect(order.save).not.toHaveBeenCalled();
  });
});
