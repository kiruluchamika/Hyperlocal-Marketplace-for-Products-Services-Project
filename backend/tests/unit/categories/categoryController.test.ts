import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../../src/utils/AppError";

const { categoryServiceMock } = vi.hoisted(() => ({
  categoryServiceMock: {
    createCategory: vi.fn(),
    getAllCategories: vi.fn(),
    getCategoryById: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn()
  }
}));

vi.mock("../../../src/services/categoryService", () => categoryServiceMock);

import {
  createCategoryHandler,
  deleteCategoryHandler,
  getCategoriesHandler,
  getCategoryByIdHandler
} from "../../../src/controllers/categoryController";

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

describe("categoryController", () => {
  it("returns a created category response with mapped _id", async () => {
    const req = {
      body: {
        name: "Electronics",
        type: "PRODUCT",
        image: "image.png"
      }
    };
    const res = makeResponse();
    const next = vi.fn();

    categoryServiceMock.createCategory.mockResolvedValue({
      id: "507f1f77bcf86cd799439011",
      name: "Electronics",
      type: "PRODUCT",
      description: "Devices",
      image: "image.png",
      attributes: [],
      isActive: true,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-02T00:00:00.000Z")
    });

    createCategoryHandler(req as never, res as never, next);
    await flushPromises();

    expect(categoryServiceMock.createCategory).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      _id: "507f1f77bcf86cd799439011",
      name: "Electronics",
      type: "PRODUCT",
      description: "Devices",
      image: "image.png",
      attributes: [],
      isActive: true,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-02T00:00:00.000Z")
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns paginated category lists with mapped items", async () => {
    const req = {
      query: {
        type: "PRODUCT",
        page: 1,
        limit: 2
      }
    };
    const res = makeResponse();
    const next = vi.fn();

    categoryServiceMock.getAllCategories.mockResolvedValue({
      data: [
        {
          id: "507f1f77bcf86cd799439011",
          name: "Electronics",
          type: "PRODUCT",
          description: "Devices",
          image: "image.png",
          attributes: [],
          isActive: true,
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
          updatedAt: new Date("2024-01-02T00:00:00.000Z")
        }
      ],
      pagination: {
        page: 1,
        limit: 2,
        total: 1,
        totalPages: 1
      }
    });

    getCategoriesHandler(req as never, res as never, next);
    await flushPromises();

    expect(categoryServiceMock.getAllCategories).toHaveBeenCalledWith(req.query);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [
        {
          _id: "507f1f77bcf86cd799439011",
          name: "Electronics",
          type: "PRODUCT",
          description: "Devices",
          image: "image.png",
          attributes: [],
          isActive: true,
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
          updatedAt: new Date("2024-01-02T00:00:00.000Z")
        }
      ],
      pagination: {
        page: 1,
        limit: 2,
        total: 1,
        totalPages: 1
      }
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns a successful delete message", async () => {
    const req = {
      params: {
        id: "507f1f77bcf86cd799439011"
      }
    };
    const res = makeResponse();
    const next = vi.fn();

    categoryServiceMock.deleteCategory.mockResolvedValue(undefined);

    deleteCategoryHandler(req as never, res as never, next);
    await flushPromises();

    expect(categoryServiceMock.deleteCategory).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Category deleted successfully"
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards service errors to next", async () => {
    const req = {
      params: {
        id: "507f1f77bcf86cd799439011"
      }
    };
    const res = makeResponse();
    const next = vi.fn();
    const error = new AppError("Category not found", 404);

    categoryServiceMock.getCategoryById.mockRejectedValue(error);

    getCategoryByIdHandler(req as never, res as never, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
