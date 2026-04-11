import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../../src/utils/AppError";

const { listingServiceMock } = vi.hoisted(() => ({
  listingServiceMock: {
    canModifyListing: vi.fn()
  }
}));

vi.mock("../../../src/services/listingService", () => listingServiceMock);

import { requireOwnershipOrAdmin } from "../../../src/middlewares/requireOwnershipOrAdmin";

afterEach(() => {
  vi.clearAllMocks();
});

describe("requireOwnershipOrAdmin", () => {
  it("rejects unauthenticated requests", async () => {
    const next = vi.fn();

    await requireOwnershipOrAdmin({ params: { id: "507f1f77bcf86cd799439011" } } as never, {} as never, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(listingServiceMock.canModifyListing).not.toHaveBeenCalled();
  });

  it("rejects users who cannot modify the listing", async () => {
    const next = vi.fn();
    listingServiceMock.canModifyListing.mockResolvedValue(false);

    await requireOwnershipOrAdmin(
      {
        params: { id: "507f1f77bcf86cd799439011" },
        user: { id: "507f1f77bcf86cd799439012", role: "user" }
      } as never,
      {} as never,
      next
    );

    expect(listingServiceMock.canModifyListing).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      "507f1f77bcf86cd799439012",
      "user"
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Forbidden", statusCode: 403 }));
  });

  it("allows owners or admins through", async () => {
    const next = vi.fn();
    listingServiceMock.canModifyListing.mockResolvedValue(true);

    await requireOwnershipOrAdmin(
      {
        params: { id: "507f1f77bcf86cd799439011" },
        user: { id: "507f1f77bcf86cd799439012", role: "admin" }
      } as never,
      {} as never,
      next
    );

    expect(next).toHaveBeenCalledWith();
  });
});
