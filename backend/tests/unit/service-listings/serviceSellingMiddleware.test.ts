import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../../src/utils/AppError";

const { serviceSellingServiceMock } = vi.hoisted(() => ({
  serviceSellingServiceMock: {
    canModifyServiceSelling: vi.fn(),
  },
}));

vi.mock("../../../src/services/serviceSellingService", () => serviceSellingServiceMock);

import { requireServiceSellingOwnershipOrAdmin } from "../../../src/middlewares/requireServiceSellingOwnershipOrAdmin";

afterEach(() => {
  vi.clearAllMocks();
});

describe("requireServiceSellingOwnershipOrAdmin", () => {
  it("rejects unauthenticated requests", async () => {
    const next = vi.fn();

    await requireServiceSellingOwnershipOrAdmin(
      { params: { id: "507f1f77bcf86cd799439011" } } as never,
      {} as never,
      next
    );

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect(serviceSellingServiceMock.canModifyServiceSelling).not.toHaveBeenCalled();
  });

  it("rejects users who cannot modify the service listing", async () => {
    const next = vi.fn();
    serviceSellingServiceMock.canModifyServiceSelling.mockResolvedValue(false);

    await requireServiceSellingOwnershipOrAdmin(
      {
        params: { id: "507f1f77bcf86cd799439011" },
        user: { id: "507f1f77bcf86cd799439012", role: "user" },
      } as never,
      {} as never,
      next
    );

    expect(serviceSellingServiceMock.canModifyServiceSelling).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      "507f1f77bcf86cd799439012",
      "user"
    );
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Forbidden", statusCode: 403 })
    );
  });

  it("allows owners through", async () => {
    const next = vi.fn();
    serviceSellingServiceMock.canModifyServiceSelling.mockResolvedValue(true);

    await requireServiceSellingOwnershipOrAdmin(
      {
        params: { id: "507f1f77bcf86cd799439011" },
        user: { id: "507f1f77bcf86cd799439012", role: "user" },
      } as never,
      {} as never,
      next
    );

    expect(next).toHaveBeenCalledWith();
  });
});
