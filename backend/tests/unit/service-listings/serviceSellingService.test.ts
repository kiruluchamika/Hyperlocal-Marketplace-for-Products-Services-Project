import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../../src/utils/AppError";

const { categoryModelMock, serviceSellingModelMock } = vi.hoisted(() => ({
  categoryModelMock: {
    findById: vi.fn(),
  },
  serviceSellingModelMock: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock("../../../src/models/Category", () => ({
  default: categoryModelMock,
}));

vi.mock("../../../src/models/ServiceSelling", () => ({
  default: serviceSellingModelMock,
}));

import {
  canModifyServiceSelling,
  createServiceSelling,
  deleteServiceSelling,
  getServiceSellingById,
  listServiceSelling,
  moderateRemoveServiceSelling,
  updateServiceSelling,
} from "../../../src/services/serviceSellingService";

const sellerId = "507f1f77bcf86cd799439012";
const otherUserId = "507f1f77bcf86cd799439099";
const adminId = "507f1f77bcf86cd799439098";
const categoryId = "507f1f77bcf86cd799439011";
const serviceId = "507f1f77bcf86cd799439013";

const makeCategory = (overrides: Record<string, unknown> = {}) => ({
  _id: categoryId,
  type: "SERVICE",
  isActive: true,
  image: "https://example.com/category.png",
  attributes: [
    { fieldName: "experience", required: true },
    { fieldName: "toolsProvided", required: false },
  ],
  ...overrides,
});

const makeServiceDoc = (overrides: Record<string, unknown> = {}) => ({
  _id: serviceId,
  sellerId: { toString: () => sellerId },
  categoryId,
  title: "Home Cleaning",
  description: "Detailed cleaning service",
  price: 2500,
  pricingType: "FIXED",
  locationText: "Colombo",
  location: {
    city: "Colombo",
    address: "Main Street",
    coordinates: {
      type: "Point",
      coordinates: [79.8612, 6.9271],
    },
  },
  images: ["https://example.com/service.png"],
  attributeValues: { experience: "5 years" },
  status: "ACTIVE",
  isActive: true,
  viewsCount: 2,
  viewedByUserIds: [],
  removedReason: undefined,
  removedAt: undefined,
  deletedAt: undefined,
  save: vi.fn().mockResolvedValue(undefined),
  toObject: vi.fn().mockReturnValue({
    _id: serviceId,
    sellerId: { _id: sellerId },
    categoryId: {
      _id: categoryId,
      name: "Cleaning",
      type: "SERVICE",
      image: "https://example.com/category.png",
    },
    title: "Home Cleaning",
    description: "Detailed cleaning service",
    price: 2500,
    pricingType: "FIXED",
    locationText: "Colombo",
    images: ["https://example.com/service.png"],
    attributeValues: { experience: "5 years" },
    status: "ACTIVE",
    isActive: true,
    viewsCount: 2,
    viewedByUserIds: [],
  }),
  ...overrides,
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("serviceSellingService", () => {
  it("creates a service listing after validating category and required attributes", async () => {
    const category = makeCategory();
    const created = makeServiceDoc();

    categoryModelMock.findById.mockResolvedValue(category);
    serviceSellingModelMock.create.mockResolvedValue(created);

    const result = await createServiceSelling(sellerId, {
      title: "Home Cleaning",
      description: "Deep cleaning for apartments and houses.",
      categoryId,
      price: 2500,
      pricingType: "FIXED",
      locationText: "Colombo",
      location: {
        city: "Colombo",
        address: "Main Street",
        coordinates: {
          coordinates: [79.8612, 6.9271],
        },
      },
      attributeValues: {
        experience: "5 years",
      },
      images: ["https://example.com/service.png"],
    });

    expect(categoryModelMock.findById).toHaveBeenCalledWith(categoryId);
    expect(serviceSellingModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Home Cleaning",
        sellerId: expect.anything(),
        categoryId,
        status: "ACTIVE",
        isActive: true,
        location: {
          city: "Colombo",
          address: "Main Street",
          coordinates: {
            type: "Point",
            coordinates: [79.8612, 6.9271],
          },
        },
        attributeValues: {
          experience: "5 years",
        },
      })
    );
    expect(result).toBe(created);
  });

  it("rejects creation when required category attributes are missing", async () => {
    categoryModelMock.findById.mockResolvedValue(makeCategory());

    await expect(
      createServiceSelling(sellerId, {
        title: "Home Cleaning",
        categoryId,
        price: 2500,
        pricingType: "FIXED",
        locationText: "Colombo",
        location: {
          city: "Colombo",
        },
        attributeValues: {},
      })
    ).rejects.toMatchObject<AppError>({
      message: "Missing required attribute: experience",
      statusCode: 400,
    });

    expect(serviceSellingModelMock.create).not.toHaveBeenCalled();
  });

  it("builds the active-only public list filter and normalizes display images", async () => {
    const services = [
      makeServiceDoc({
        images: [],
        categoryId: {
          _id: categoryId,
          name: "Cleaning",
          type: "SERVICE",
          image: "https://example.com/category.png",
        },
        toObject: vi.fn().mockReturnValue({
          _id: serviceId,
          sellerId: { _id: sellerId },
          categoryId: {
            _id: categoryId,
            name: "Cleaning",
            type: "SERVICE",
            image: "https://example.com/category.png",
          },
          title: "Home Cleaning",
          images: [],
          viewedByUserIds: [],
          status: "ACTIVE",
          isActive: true,
        }),
      }),
    ];
    const populateMock = vi.fn().mockResolvedValue(services);
    const sortMock = vi.fn().mockReturnValue({ populate: populateMock });
    const selectMock = vi.fn().mockReturnValue({ sort: sortMock });

    serviceSellingModelMock.find.mockReturnValue({ select: selectMock });

    const result = await listServiceSelling({
      categoryId,
      pricingType: "FIXED",
      minPrice: 1000,
      maxPrice: 5000,
      search: "cleaning",
    });

    expect(serviceSellingModelMock.find).toHaveBeenCalledWith({
      status: "ACTIVE",
      isActive: { $ne: false },
      deletedAt: { $exists: false },
      removedAt: { $exists: false },
      categoryId,
      pricingType: "FIXED",
      price: { $gte: 1000, $lte: 5000 },
      $or: [
        { title: { $regex: "cleaning", $options: "i" } },
        { description: { $regex: "cleaning", $options: "i" } },
        { locationText: { $regex: "cleaning", $options: "i" } },
      ],
    });
    expect(result).toEqual([
      expect.objectContaining({
        displayImage: "https://example.com/category.png",
        status: "ACTIVE",
        isActive: true,
      }),
    ]);
  });

  it("increments views once for a first-time authenticated viewer", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const service = makeServiceDoc({
      viewsCount: 2,
      viewedByUserIds: [],
      save,
    });
    const populateMock = vi.fn().mockResolvedValue(service);
    const selectMock = vi.fn().mockReturnValue({ populate: populateMock });

    serviceSellingModelMock.findById.mockReturnValue({ select: selectMock });

    const result = await getServiceSellingById(serviceId, otherUserId, "user");

    expect(service.viewsCount).toBe(3);
    expect(service.viewedByUserIds).toHaveLength(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        _id: serviceId,
        status: "ACTIVE",
        isActive: true,
      })
    );
  });

  it("hides removed listings from non-owners and non-admins", async () => {
    const service = makeServiceDoc({
      status: "REMOVED",
      isActive: false,
      removedReason: "Policy violation",
      removedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const populateMock = vi.fn().mockResolvedValue(service);
    const selectMock = vi.fn().mockReturnValue({ populate: populateMock });

    serviceSellingModelMock.findById.mockReturnValue({ select: selectMock });

    await expect(getServiceSellingById(serviceId, otherUserId, "user")).rejects.toMatchObject<AppError>({
      message: "Service ad not found",
      statusCode: 404,
    });
  });

  it("rejects updates from non-owners", async () => {
    serviceSellingModelMock.findById.mockResolvedValue(makeServiceDoc());

    await expect(
      updateServiceSelling(serviceId, otherUserId, { title: "Updated title" })
    ).rejects.toMatchObject<AppError>({
      message: "Forbidden",
      statusCode: 403,
    });
  });

  it("updates service listings with rebuilt location data", async () => {
    const existing = makeServiceDoc();
    const category = makeCategory();
    const updated = makeServiceDoc({
      title: "Updated Service",
      location: {
        city: "Galle",
        address: "Beach Road",
        coordinates: {
          type: "Point",
          coordinates: [80.217, 6.0329],
        },
      },
      attributeValues: {
        experience: "7 years",
      },
    });
    const populateMock = vi.fn().mockResolvedValue(updated);

    serviceSellingModelMock.findById.mockResolvedValue(existing);
    categoryModelMock.findById.mockResolvedValue(category);
    serviceSellingModelMock.findByIdAndUpdate.mockReturnValue({ populate: populateMock });

    const result = await updateServiceSelling(serviceId, sellerId, {
      title: "Updated Service",
      location: {
        city: "Galle",
        address: "Beach Road",
        coordinates: {
          coordinates: [80.217, 6.0329],
        },
      },
      attributeValues: {
        experience: "7 years",
      },
    });

    expect(serviceSellingModelMock.findByIdAndUpdate).toHaveBeenCalledWith(
      serviceId,
      expect.objectContaining({
        title: "Updated Service",
        location: {
          city: "Galle",
          address: "Beach Road",
          coordinates: {
            type: "Point",
            coordinates: [80.217, 6.0329],
          },
        },
        attributeValues: {
          experience: "7 years",
        },
      }),
      { new: true }
    );
    expect(result).toBe(updated);
  });

  it("soft deletes service listings for owners", async () => {
    const service = makeServiceDoc();
    serviceSellingModelMock.findById.mockResolvedValue(service);

    const result = await deleteServiceSelling(serviceId, sellerId);

    expect(service.status).toBe("DELETED");
    expect(service.isActive).toBe(false);
    expect(service.deletedAt).toBeInstanceOf(Date);
    expect(service.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ message: "Service ad deleted successfully" });
  });

  it("marks service listings removed during moderation", async () => {
    const service = makeServiceDoc();
    serviceSellingModelMock.findById.mockResolvedValue(service);

    const result = await moderateRemoveServiceSelling(serviceId, adminId, "Violates policy");

    expect(service.status).toBe("REMOVED");
    expect(service.isActive).toBe(false);
    expect(service.removedReason).toBe("Violates policy");
    expect(service.removedBy).toBeTruthy();
    expect(service.removedAt).toBeInstanceOf(Date);
    expect(service.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      message: "Service ad removed by admin",
      data: service,
    });
  });

  it("returns ownership checks based on the seller id", async () => {
    serviceSellingModelMock.findById.mockResolvedValue(makeServiceDoc());

    await expect(canModifyServiceSelling(serviceId, sellerId, "user")).resolves.toBe(true);
    await expect(canModifyServiceSelling(serviceId, otherUserId, "admin")).resolves.toBe(false);
  });
});
