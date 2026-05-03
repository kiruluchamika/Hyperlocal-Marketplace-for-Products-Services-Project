import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../../src/utils/AppError";

const { listingServiceMock } = vi.hoisted(() => ({
  listingServiceMock: {
    createListing: vi.fn(),
    getListings: vi.fn(),
    getListingById: vi.fn(),
    updateListing: vi.fn(),
    deleteListing: vi.fn()
  }
}));

vi.mock("../../../src/services/listingService", () => listingServiceMock);

import {
  createListingHandler,
  deleteListingHandler,
  getListingByIdHandler,
  listListingsHandler,
  updateListingHandler
} from "../../../src/controllers/listingController";

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

describe("listingController", () => {
  it("creates a listing for the authenticated user", async () => {
    const req = {
      user: { id: "507f1f77bcf86cd799439012" },
      body: { title: "Gaming Laptop" }
    };
    const res = makeResponse();
    const next = vi.fn();
    const listing = { _id: "507f1f77bcf86cd799439011", title: "Gaming Laptop" };

    listingServiceMock.createListing.mockResolvedValue(listing);

    createListingHandler(req as never, res as never, next);
    await flushPromises();

    expect(listingServiceMock.createListing).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439012",
      req.body
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: listing
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("maps listing query params before calling the service", async () => {
    const req = {
      query: {
        search: "camera",
        categoryId: "507f1f77bcf86cd799439011",
        minPrice: "1000",
        maxPrice: "5000",
        city: "Colombo",
        condition: "USED_GOOD",
        transactionMode: "NEGOTIABLE",
        page: "2",
        limit: "5"
      }
    };
    const res = makeResponse();
    const next = vi.fn();

    listingServiceMock.getListings.mockResolvedValue({
      listings: [{ _id: "listing-1" }],
      pagination: { page: 2, limit: 5, total: 1, totalPages: 1 }
    });

    listListingsHandler(req as never, res as never, next);
    await flushPromises();

    expect(listingServiceMock.getListings).toHaveBeenCalledWith({
      categoryId: "507f1f77bcf86cd799439011",
      minPrice: 1000,
      maxPrice: 5000,
      city: "Colombo",
      condition: "USED_GOOD",
      transactionMode: "NEGOTIABLE",
      searchTerm: "camera",
      page: 2,
      limit: 5
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ _id: "listing-1" }],
      pagination: { page: 2, limit: 5, total: 1, totalPages: 1 }
    });
  });

  it("passes requester context when fetching a listing by id", async () => {
    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      user: { id: "507f1f77bcf86cd799439012", role: "admin" }
    };
    const res = makeResponse();
    const next = vi.fn();

    listingServiceMock.getListingById.mockResolvedValue({ _id: "507f1f77bcf86cd799439011" });

    getListingByIdHandler(req as never, res as never, next);
    await flushPromises();

    expect(listingServiceMock.getListingById).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      "507f1f77bcf86cd799439012",
      "admin"
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns the update success message from the controller", async () => {
    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      user: { id: "507f1f77bcf86cd799439012", role: "user" },
      body: { title: "Updated title" }
    };
    const res = makeResponse();
    const next = vi.fn();
    const listing = { _id: "507f1f77bcf86cd799439011", title: "Updated title" };

    listingServiceMock.updateListing.mockResolvedValue(listing);

    updateListingHandler(req as never, res as never, next);
    await flushPromises();

    expect(listingServiceMock.updateListing).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      "507f1f77bcf86cd799439012",
      "user",
      { title: "Updated title" }
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: listing,
      message: "Listing updated successfully"
    });
  });

  it("forwards service errors to next", async () => {
    const req = {
      params: { id: "507f1f77bcf86cd799439011" },
      user: { id: "507f1f77bcf86cd799439012", role: "user" }
    };
    const res = makeResponse();
    const next = vi.fn();
    const error = new AppError("Listing not found", 404);

    listingServiceMock.deleteListing.mockRejectedValue(error);

    deleteListingHandler(req as never, res as never, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
