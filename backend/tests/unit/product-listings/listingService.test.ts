import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../../src/utils/AppError";

const { productListingModelMock, categoryModelMock, userModelMock, userServiceMock } = vi.hoisted(() => ({
  productListingModelMock: {
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    findById: vi.fn()
  },
  categoryModelMock: {
    findById: vi.fn()
  },
  userModelMock: {
    findById: vi.fn(),
    exists: vi.fn(),
    updateOne: vi.fn()
  },
  userServiceMock: {
    hasCreatedListings: vi.fn()
  }
}));

vi.mock("../../../src/models/ProductListing", () => ({
  default: productListingModelMock
}));

vi.mock("../../../src/models/Category", () => ({
  default: categoryModelMock
}));

vi.mock("../../../src/models/User", () => ({
  default: userModelMock
}));

vi.mock("../../../src/services/userService", () => userServiceMock);

import {
  canModifyListing,
  createListing,
  deleteListing,
  getListingById,
  getListings,
  hasUserCreatedListings,
  saveListingToWishlist,
  updateListing
} from "../../../src/services/listingService";

const ownerId = "507f1f77bcf86cd799439012";
const categoryId = "507f1f77bcf86cd799439011";
const listingId = "507f1f77bcf86cd799439013";

const makeCategory = (overrides: Record<string, unknown> = {}) => ({
  _id: categoryId,
  isActive: true,
  type: "PRODUCT",
  attributes: [
    { fieldName: "Brand", fieldType: "text" },
    { fieldName: "ConditionGrade", fieldType: "select", options: ["A", "B"] }
  ],
  ...overrides
});

const makeListingDoc = (overrides: Record<string, unknown> = {}) => ({
  _id: listingId,
  ownerId: { toString: () => ownerId },
  categoryId,
  transactionMode: "BUY_NOW",
  title: "Camera",
  description: "Well maintained compact camera",
  attributes: {},
  price: 25000,
  currency: "LKR",
  isNegotiable: false,
  condition: "USED_GOOD",
  images: ["https://example.com/image.jpg"],
  location: {
    city: "Colombo",
    coordinates: {
      type: "Point",
      coordinates: [79.8612, 6.9271]
    }
  },
  status: "ACTIVE",
  tags: [],
  viewsCount: 0,
  viewedByUserIds: [],
  savedCount: 0,
  suspendDeadline: new Date("2026-01-01T00:00:00.000Z"),
  populate: vi.fn().mockResolvedValue(undefined),
  save: vi.fn().mockResolvedValue(undefined),
  toObject: vi.fn().mockReturnValue({
    _id: listingId,
    ownerId: { _id: ownerId },
    status: "ACTIVE",
    viewedByUserIds: [],
    viewsCount: 0,
    savedCount: 0
  }),
  ...overrides
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("listingService", () => {
  it("creates a listing after validating category, attributes, and coordinates", async () => {
    const category = makeCategory();
    const listing = makeListingDoc();

    categoryModelMock.findById.mockResolvedValue(category);
    productListingModelMock.create.mockResolvedValue(listing);

    const result = await createListing(ownerId, {
      type: "PRODUCT",
      transactionMode: "NEGOTIABLE",
      title: "Vintage Camera",
      description: "A well-kept camera with lens and carrying case included.",
      categoryId,
      attributes: {
        Brand: "Canon",
        ConditionGrade: "A"
      },
      price: 50000,
      currency: "usd",
      condition: "USED_GOOD",
      images: ["https://example.com/camera.jpg"],
      location: {
        city: "Colombo",
        address: "Main Street",
        coordinates: { lat: 6.9271, lng: 79.8612 }
      },
      tags: ["camera"]
    });

    expect(categoryModelMock.findById).toHaveBeenCalledWith(categoryId);
    expect(productListingModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "PRODUCT",
        transactionMode: "NEGOTIABLE",
        title: "Vintage Camera",
        categoryId: expect.anything(),
        ownerId: expect.anything(),
        attributes: {
          Brand: "Canon",
          ConditionGrade: "A"
        },
        isNegotiable: true,
        currency: "usd",
        location: {
          city: "Colombo",
          address: "Main Street",
          coordinates: {
            type: "Point",
            coordinates: [79.8612, 6.9271]
          }
        },
        status: "ACTIVE",
        tags: ["camera"]
      })
    );
    expect(listing.populate).toHaveBeenCalled();
    expect(result).toBe(listing);
  });

  it("rejects unknown attributes during listing creation", async () => {
    categoryModelMock.findById.mockResolvedValue(makeCategory());

    await expect(
      createListing(ownerId, {
        type: "PRODUCT",
        transactionMode: "BUY_NOW",
        title: "Desk",
        description: "Solid desk with drawers and enough space for study setup.",
        categoryId,
        attributes: {
          UnsupportedField: "value"
        },
        price: 12000,
        currency: "LKR",
        condition: "USED_GOOD",
        images: ["https://example.com/desk.jpg"],
        location: {
          city: "Kandy",
          coordinates: [80.6337, 7.2906]
        }
      })
    ).rejects.toMatchObject<AppError>({
      message: expect.stringContaining("Unknown attribute"),
      statusCode: 400
    });

    expect(productListingModelMock.create).not.toHaveBeenCalled();
  });

  it("builds an active-only listing filter with pagination", async () => {
    const listings = [makeListingDoc()];
    const limitMock = vi.fn().mockResolvedValue(listings);
    const skipMock = vi.fn().mockReturnValue({ limit: limitMock });
    const sortMock = vi.fn().mockReturnValue({ skip: skipMock });
    const populateOwnerMock = vi.fn().mockReturnValue({ sort: sortMock });
    const populateCategoryMock = vi.fn().mockReturnValue({ populate: populateOwnerMock });

    productListingModelMock.find.mockReturnValue({ populate: populateCategoryMock });
    productListingModelMock.countDocuments.mockResolvedValue(12);

    const result = await getListings({
      categoryId,
      minPrice: 1000,
      maxPrice: 5000,
      city: "Colombo",
      condition: "USED_GOOD",
      transactionMode: "NEGOTIABLE",
      searchTerm: "camera",
      page: 2,
      limit: 150
    });

    expect(productListingModelMock.find).toHaveBeenCalledWith({
      status: "ACTIVE",
      categoryId: expect.anything(),
      price: { $gte: 1000, $lte: 5000 },
      "location.city": /Colombo/i,
      condition: "USED_GOOD",
      transactionMode: "NEGOTIABLE",
      $text: { $search: "camera" }
    });
    expect(skipMock).toHaveBeenCalledWith(100);
    expect(limitMock).toHaveBeenCalledWith(100);
    expect(productListingModelMock.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ACTIVE" })
    );
    expect(result).toEqual({
      listings,
      pagination: {
        page: 2,
        limit: 100,
        total: 12,
        totalPages: 1
      }
    });
  });

  it("returns a serialized listing and increments views for a first-time viewer", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const listing = makeListingDoc({
      viewedByUserIds: [],
      viewsCount: 3,
      save,
      toObject: vi.fn().mockReturnValue({
        _id: listingId,
        ownerId: { _id: ownerId },
        title: "Camera",
        status: "ACTIVE",
        viewedByUserIds: [],
        viewsCount: 3,
        savedCount: 0
      })
    });
    const populateOwnerMock = vi.fn().mockResolvedValue(listing);
    const populateCategoryMock = vi.fn().mockReturnValue({ populate: populateOwnerMock });
    const selectMock = vi.fn().mockReturnValue({ populate: populateCategoryMock });

    productListingModelMock.findById.mockReturnValue({ select: selectMock });
    userModelMock.exists.mockResolvedValue(true);

    const result = await getListingById(listingId, "507f1f77bcf86cd799439099", "user");

    expect(userModelMock.exists).toHaveBeenCalled();
    expect(listing.viewsCount).toBe(4);
    expect(listing.viewedByUserIds).toHaveLength(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      _id: listingId,
      ownerId: { _id: ownerId },
      title: "Camera",
      status: "ACTIVE",
      viewsCount: 3,
      savedCount: 0,
      isWishlisted: true
    });
  });

  it("hides non-active listings from non-owners and non-admins", async () => {
    const listing = makeListingDoc({
      status: "HIDDEN"
    });
    const populateOwnerMock = vi.fn().mockResolvedValue(listing);
    const populateCategoryMock = vi.fn().mockReturnValue({ populate: populateOwnerMock });
    const selectMock = vi.fn().mockReturnValue({ populate: populateCategoryMock });

    productListingModelMock.findById.mockReturnValue({ select: selectMock });

    await expect(
      getListingById(listingId, "507f1f77bcf86cd799439099", "user")
    ).rejects.toMatchObject<AppError>({
      message: "Listing not found",
      statusCode: 404
    });
  });

  it("rejects updates from non-owners who are not admins", async () => {
    productListingModelMock.findById.mockResolvedValue(makeListingDoc());

    await expect(
      updateListing(listingId, "507f1f77bcf86cd799439099", "user", { title: "Updated" })
    ).rejects.toMatchObject<AppError>({
      message: "You are not authorized to update this listing",
      statusCode: 403
    });
  });

  it("moves suspended listings back under review when the owner edits them", async () => {
    const listing = makeListingDoc({
      status: "SUSPENDED",
      suspendDeadline: new Date("2026-01-01T00:00:00.000Z"),
      location: {
        city: "Colombo",
        address: "Old address",
        coordinates: {
          type: "Point",
          coordinates: [79.9, 6.9]
        }
      }
    });
    const category = makeCategory();

    productListingModelMock.findById.mockResolvedValue(listing);
    categoryModelMock.findById.mockResolvedValue(category);

    const result = await updateListing(listingId, ownerId, "user", {
      title: "Updated title",
      attributes: { Brand: "Canon" },
      location: {
        city: "Galle",
        address: "New address"
      }
    });

    expect(listing.title).toBe("Updated title");
    expect(listing.status).toBe("UNDER_REVIEW");
    expect(listing.suspendDeadline).toBeUndefined();
    expect(listing.location).toEqual({
      city: "Galle",
      address: "New address",
      coordinates: {
        type: "Point",
        coordinates: [79.9, 6.9]
      }
    });
    expect(listing.save).toHaveBeenCalledTimes(1);
    expect(result).toBe(listing);
  });

  it("soft deletes listings for owners", async () => {
    const listing = makeListingDoc();
    productListingModelMock.findById.mockResolvedValue(listing);

    const result = await deleteListing(listingId, ownerId, "user");

    expect(listing.status).toBe("DELETED");
    expect(listing.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ message: "Listing deleted successfully" });
  });

  it("prevents users from saving their own listing to the wishlist", async () => {
    const user = {
      _id: ownerId,
      wishlist: [],
      select: vi.fn()
    };
    const listing = makeListingDoc({
      ownerId: { _id: { toString: () => ownerId } }
    });
    const populateOwnerMock = vi.fn().mockResolvedValue(listing);
    const populateCategoryMock = vi.fn().mockReturnValue({ populate: populateOwnerMock });
    const selectMock = vi.fn().mockReturnValue({ populate: populateCategoryMock });

    userModelMock.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue(user)
    });
    productListingModelMock.findById.mockReturnValue({ select: selectMock });

    await expect(saveListingToWishlist(ownerId, listingId)).rejects.toMatchObject<AppError>({
      message: "You cannot save your own listing",
      statusCode: 400
    });

    expect(userModelMock.updateOne).not.toHaveBeenCalled();
  });

  it("delegates listing existence checks for seller detection", async () => {
    userServiceMock.hasCreatedListings.mockResolvedValue(true);

    await expect(hasUserCreatedListings(ownerId)).resolves.toBe(true);
    expect(userServiceMock.hasCreatedListings).toHaveBeenCalledWith(ownerId);
  });

  it("allows admins to modify any listing", async () => {
    await expect(canModifyListing(listingId, ownerId, "admin")).resolves.toBe(true);
    expect(productListingModelMock.findById).not.toHaveBeenCalled();
  });
});
