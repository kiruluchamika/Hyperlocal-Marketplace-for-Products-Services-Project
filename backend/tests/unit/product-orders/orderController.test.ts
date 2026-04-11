import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../../src/utils/AppError";

const { orderServiceMock } = vi.hoisted(() => ({
  orderServiceMock: {
    createOrder: vi.fn(),
    listOrders: vi.fn(),
    deleteOrder: vi.fn(),
    acceptOrder: vi.fn()
  }
}));

vi.mock("../../../src/services/orderService", () => ({
  OrderService: vi.fn().mockImplementation(function OrderService() {
    return orderServiceMock;
  })
}));

import {
  acceptOrder,
  createOrder,
  deleteOrder,
  listOrders
} from "../../../src/controllers/orderController";

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const makeResponse = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn()
  };

  res.status.mockReturnValue(res);
  return res;
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("orderController", () => {
  it("creates an order for the authenticated buyer", async () => {
    const req = {
      user: { id: "buyer-1" },
      body: {
        listingId: "507f1f77bcf86cd799439011",
        quantity: 2,
        deliveryMethod: "DELIVERY",
        deliveryAddress: "123 Main Street, Colombo",
        note: "Please call on arrival"
      }
    };
    const res = makeResponse();
    const next = vi.fn();
    const serviceResult = {
      order: { _id: "order-1" },
      message: "Order created successfully. Please proceed to payment.",
      nextStep: "INITIATE_PAYMENT"
    };

    orderServiceMock.createOrder.mockResolvedValue(serviceResult);

    createOrder(req as never, res as never, next);
    await flushPromises();

    expect(orderServiceMock.createOrder).toHaveBeenCalledWith("buyer-1", req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: serviceResult.message,
      data: {
        order: serviceResult.order,
        nextStep: serviceResult.nextStep
      }
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("parses list query values before calling the service", async () => {
    const req = {
      user: { id: "user-1", role: "admin" },
      query: {
        status: "PENDING",
        page: "3",
        limit: "15"
      }
    };
    const res = makeResponse();
    const next = vi.fn();

    orderServiceMock.listOrders.mockResolvedValue({
      orders: [{ order: { _id: "order-1" }, actionsAllowed: ["OVERRIDE_STATUS"] }],
      pagination: { page: 3, limit: 15, total: 1, totalPages: 1 }
    });

    listOrders(req as never, res as never, next);
    await flushPromises();

    expect(orderServiceMock.listOrders).toHaveBeenCalledWith("user-1", "admin", {
      status: "PENDING",
      page: 3,
      limit: 15
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("passes admin delete options through to the service", async () => {
    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      user: { id: "admin-1" },
      body: {
        reason: "Fraudulent payment detected",
        refund: true
      }
    };
    const res = makeResponse();
    const next = vi.fn();
    const serviceResult = {
      order: { _id: "507f1f77bcf86cd799439011", isDeleted: true },
      message: "Order archived successfully - Reason: Fraudulent payment detected"
    };

    orderServiceMock.deleteOrder.mockResolvedValue(serviceResult);

    deleteOrder(req as never, res as never, next);
    await flushPromises();

    expect(orderServiceMock.deleteOrder).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      "admin-1",
      {
        reason: "Fraudulent payment detected",
        refund: true
      }
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: serviceResult.message,
      data: {
        order: serviceResult.order
      }
    });
  });

  it("forwards service errors to next", async () => {
    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      user: { id: "seller-1" }
    };
    const res = makeResponse();
    const next = vi.fn();
    const error = new AppError("Order not found", 404);

    orderServiceMock.acceptOrder.mockRejectedValue(error);

    acceptOrder(req as never, res as never, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
