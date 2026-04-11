import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../../src/utils/AppError";

const { categoryModelMock } = vi.hoisted(() => ({
  categoryModelMock: {
    findOne: vi.fn(),
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    findById: vi.fn(),
    findByIdAndDelete: vi.fn()
  }
}));

vi.mock("../../../src/models/Category", () => ({
  default: categoryModelMock
}));

import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getCategoryById,
  updateCategory
} from "../../../src/services/categoryService";

const makeCategoryDoc = (overrides: Record<string, unknown> = {}) => ({
  id: "507f1f77bcf86cd799439011",
  name: "Electronics",
  type: "PRODUCT",
  description: "Devices",
  image: "image.png",
  attributes: [],
  isActive: true,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-02T00:00:00.000Z"),
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("categoryService", () => {
  it("creates a category when the name is unique", async () => {
    const input = {
      name: "Electronics",
      type: "PRODUCT" as const,
      image: "image.png"
    };
    const createdCategory = makeCategoryDoc(input);

    categoryModelMock.findOne.mockResolvedValue(null);
    categoryModelMock.create.mockResolvedValue(createdCategory);

    const result = await createCategory(input);

    expect(categoryModelMock.findOne).toHaveBeenCalledWith({ name: "Electronics" });
    expect(categoryModelMock.create).toHaveBeenCalledWith(input);
    expect(result).toBe(createdCategory);
  });

  it("rejects duplicate category names on create", async () => {
    categoryModelMock.findOne.mockResolvedValue(makeCategoryDoc());

    await expect(
      createCategory({
        name: "Electronics",
        type: "PRODUCT",
        image: "image.png"
      })
    ).rejects.toMatchObject<AppError>({
      message: "Category with this name already exists",
      statusCode: 409
    });

    expect(categoryModelMock.create).not.toHaveBeenCalled();
  });

  it("builds filters and pagination when listing categories", async () => {
    const data = [makeCategoryDoc(), makeCategoryDoc({ id: "507f191e810c19729de860ea", name: "Home Repair", type: "SERVICE" })];
    const limitMock = vi.fn().mockResolvedValue(data);
    const skipMock = vi.fn().mockReturnValue({ limit: limitMock });
    const sortMock = vi.fn().mockReturnValue({ skip: skipMock });

    categoryModelMock.find.mockReturnValue({ sort: sortMock });
    categoryModelMock.countDocuments.mockResolvedValue(7);

    const result = await getAllCategories({
      type: "SERVICE",
      isActive: false,
      search: "home",
      page: 2,
      limit: 3
    });

    expect(categoryModelMock.find).toHaveBeenCalledWith({
      type: "SERVICE",
      isActive: false,
      $or: [
        { name: { $regex: "home", $options: "i" } },
        { description: { $regex: "home", $options: "i" } }
      ]
    });
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    expect(skipMock).toHaveBeenCalledWith(3);
    expect(limitMock).toHaveBeenCalledWith(3);
    expect(categoryModelMock.countDocuments).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      data,
      pagination: {
        page: 2,
        limit: 3,
        total: 7,
        totalPages: 3
      }
    });
  });

  it("throws when a category cannot be found by id", async () => {
    categoryModelMock.findById.mockResolvedValue(null);

    await expect(getCategoryById("507f1f77bcf86cd799439011")).rejects.toMatchObject<AppError>({
      message: "Category not found",
      statusCode: 404
    });
  });

  it("updates a category and saves the changes", async () => {
    const category = makeCategoryDoc({ name: "Old Name" });

    categoryModelMock.findById.mockResolvedValue(category);
    categoryModelMock.findOne.mockResolvedValue(null);

    const result = await updateCategory("507f1f77bcf86cd799439011", {
      name: "New Name",
      isActive: false
    });

    expect(categoryModelMock.findOne).toHaveBeenCalledWith({ name: "New Name" });
    expect(category.name).toBe("New Name");
    expect(category.isActive).toBe(false);
    expect(category.save).toHaveBeenCalledTimes(1);
    expect(result).toBe(category);
  });

  it("soft deletes a category by default", async () => {
    const category = makeCategoryDoc({ isActive: true });

    categoryModelMock.findById.mockResolvedValue(category);

    await deleteCategory("507f1f77bcf86cd799439011");

    expect(category.isActive).toBe(false);
    expect(category.save).toHaveBeenCalledTimes(1);
    expect(categoryModelMock.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it("hard deletes a category when requested", async () => {
    const category = makeCategoryDoc();

    categoryModelMock.findById.mockResolvedValue(category);
    categoryModelMock.findByIdAndDelete.mockResolvedValue(category);

    await deleteCategory("507f1f77bcf86cd799439011", false);

    expect(category.save).not.toHaveBeenCalled();
    expect(categoryModelMock.findByIdAndDelete).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
  });
});
