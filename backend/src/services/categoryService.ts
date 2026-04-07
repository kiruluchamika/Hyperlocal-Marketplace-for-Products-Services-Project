import { FilterQuery } from "mongoose";
import Category, { ICategory, CategoryType } from "../models/Category";
import { AppError } from "../utils/AppError";

interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  description?: string;
  image: string;
  attributes?: Array<{
    fieldName: string;
    fieldType: "string" | "number" | "boolean" | "select";
    required?: boolean;
    options?: string[];
  }>;
  isActive?: boolean;
}

interface UpdateCategoryInput {
  name?: string;
  type?: CategoryType;
  description?: string;
  image?: string;
  attributes?: Array<{
    fieldName: string;
    fieldType: "string" | "number" | "boolean" | "select";
    required?: boolean;
    options?: string[];
  }>;
  isActive?: boolean;
}

interface GetCategoriesQuery {
  type?: CategoryType;
  isActive?: boolean;
  search?: string;
  page: number;
  limit: number;
}

interface GetCategoriesResult {
  data: ICategory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const createCategory = async (input: CreateCategoryInput): Promise<ICategory> => {
  // Check if category with same name already exists
  const existing = await Category.findOne({ name: input.name });
  if (existing) {
    throw new AppError("Category with this name already exists", 409);
  }

  const category = await Category.create(input);
  return category;
};

export const getAllCategories = async (query: GetCategoriesQuery): Promise<GetCategoriesResult> => {
  const filter: FilterQuery<ICategory> = {};

  // Filter by type (PRODUCT or SERVICE)
  if (query.type) {
    filter.type = query.type;
  }

  // Filter by active status
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive;
  }

  // Search by name or description
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { description: { $regex: query.search, $options: "i" } }
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [data, total] = await Promise.all([
    Category.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Category.countDocuments(filter)
  ]);

  return {
    data,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1
    }
  };
};

export const getCategoryById = async (categoryId: string): Promise<ICategory> => {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new AppError("Category not found", 404);
  }
  return category;
};

export const updateCategory = async (categoryId: string, input: UpdateCategoryInput): Promise<ICategory> => {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new AppError("Category not found", 404);
  }

  // If updating name, check for uniqueness
  if (input.name && input.name !== category.name) {
    const existing = await Category.findOne({ name: input.name });
    if (existing) {
      throw new AppError("Category with this name already exists", 409);
    }
  }

  Object.assign(category, input);
  await category.save();

  return category;
};

export const deleteCategory = async (categoryId: string, softDelete: boolean = true): Promise<void> => {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new AppError("Category not found", 404);
  }

  if (softDelete) {
    // Soft delete: set isActive to false
    category.isActive = false;
    await category.save();
  } else {
    // Hard delete: remove from database
    await Category.findByIdAndDelete(categoryId);
  }
};

export const getCategoriesByType = async (type: CategoryType): Promise<ICategory[]> => {
  return Category.find({ type, isActive: true }).sort({ name: 1 });
};

export const getActiveCategoriesCount = async (): Promise<number> => {
  return Category.countDocuments({ isActive: true });
};
